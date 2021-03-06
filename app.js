const   config = require('./config.json'),
        Telegraf = require('telegraf'),
        express = require('express'),
        url = require('url'),
        fs = require('fs'),
        crypto = require('crypto'),
        youtubedl = require('youtube-dl'),
        findRemoveSync = require('find-remove')

const   usernames = process.env.USERNAMES && 
                    process.env.USERNAMES.split(',').length && 
                    process.env.USERNAMES.split(',') || 
                    config.usernames.length && 
                    config.usernames,
        port = process.env.PORT || config.port,
        baseURL = url.parse(process.env.BASE_URL || config.baseURL),
        bot = new Telegraf(process.env.BOT_TOKEN || config.telegramToken),
        age = process.env.AGE || 60*60*24*2,
        interval = process.env.INTERVAL || 1000*60*5,
        downloading = []
const validYoutubeURLs = [`youtu.be`,`www.youtube.com`]

const app = express()
app.use(express.static('dl'))
app.listen(port, () => console.log(`Service listening on port ${port}! with ${usernames}`))


function mapInfo (item) {
    if(item.acodec === 'none' || ! !!item.width) return;
    return {
        itag: item.format_id,
        filetype: item.ext,
        vcodec: item.vcodec,
        size: parseInt(item.filesize/Math.pow(10,6)) || 'unk',
        resolution:
            item.resolution ||
            (item.width ? item.width + 'x' + item.height : 'audio only')
    }
}

bot.start((ctx) =>{ctx.reply(`ارسل لي رابط يوتيوب`)})




bot.on('message', (ctx)=>{
    if(ctx.message.from.username){
        try{
            const link = url.parse(ctx.message.text)
            if(validYoutubeURLs.includes(link.hostname)){
                ctx.reply(`برجاء الانتظار ...`)
                youtubedl.getInfo(ctx.message.text, function getInfo (err, info) {

                    const formats = info.formats.map(mapInfo).filter(x=> x)
                    ctx.reply(info.title,
                        Telegraf.Extra
                            .markdown()
                            .markup((m) => m.inlineKeyboard(
                                formats.map(x => [
                                    m.callbackButton(
                                        `${x.filetype}, ${x.size}MB`,
                                        'dl,'+ctx.message.text+','+x.itag+','+x.filetype
                                        )
                                ])
                            ))
                    )
                })
            }else{
                ctx.reply(`رابط غير صالح`)
            }
        }catch(error){
            console.log(error)
            ctx.reply(`wrong url format`)
        }

    }else{
        ctx.reply(`بوت شخصي`)
    }
})

bot.action(/^dl/, async (ctx) => {

    if(ctx.update.callback_query.from.username){
        const filename = crypto.createHash('md5').update(ctx.match.input).digest("hex")
                        +'.'+ctx.match.input.split(',')[3]
        let size,title = ''
        if(downloading.includes(filename)){
            ctx.answerCbQuery(`تم تحميل الملف من قبل اضغط مره اخره`)
            return
        }
        try {
            if (fs.existsSync('dl/'+filename)) {
                ctx.reply(`file already exists.\n
                        ${baseURL.href}${filename}`)
                return
            }
        } catch(err) {
            console.error(err)
            ctx.answerCbQuery(`Error :/`)
            return
        }
        downloading.push(filename)
        ctx.answerCbQuery(`جاري التحميل`)
        const video = youtubedl(ctx.match.input.split(',')[1],
            ['-f'+ctx.match.input.split(',')[2]],
            { cwd: __dirname + '/dl'})

        video.on('info', function(info) {
            size = parseInt(info.size/Math.pow(10,6)) + 'MB'
            title = info.title
            video.pipe(fs.createWriteStream('dl/'+filename));
        })

         

            
video.on('end', ()=>{
ctx.telegram.sendChatAction(ctx.chat.id, 'upload_video');              

ctx.telegram.sendChatAction(ctx.chat.id, 'upload_audio');              









ctx.replyWithVideo(
{ source: 'dl/'+filename },
{ title: `${title}` , type: '.mp4' , supports_streaming: 'boolean' , caption: '@aymanEGY' , performer: '@aymanEGY' ,width: '640' , height: '360' , file_size: `${size}` , thumb: 'https://botmma.herokuapp.com/img/logo.png'},
) 


ctx.reply(`${title} \n
الملف صالح لمده 48 ساعه \n
${size} حجم الملف  \n
${baseURL.href}${filename}`)
            downloading.splice(downloading.indexOf(filename), 1)



        })
    }else{
        ctx.reply(`it's a private bot`)
    }

})










bot.help((ctx) => ctx.reply(`send me a youtube link`))
bot.launch()

// remove files every period of time(48h)
setInterval(()=>{
    const result = findRemoveSync(__dirname+'/dl/', {age: {seconds: age},extensions: ['.mp4', '.webm'],ignore:'.gitignore'})
},interval)
