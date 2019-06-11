const {
    TelegramBot
} = require('bottender');
const {
    createServer
} = require('bottender/express');
const query = require('./query.js');
const config = require('./bottender.config.js').telegram;

var Userlist = {};

const bot = new TelegramBot({
    accessToken: config.accessToken,
});

const sendHello = async (context) => {
    let text = 'Hi！很高興為您服務！下面有3個功能，請依自己的需求點選。祝您今天愉快!';
    let keyboardStr = JSON.stringify({
        inline_keyboard: [
            [{
                text: '不知道要吃甚麼',
                callback_data: 'case1'
            },
            {
                text: '想找特定店家資訊',
                callback_data: 'case2'
            },
            {
                text: '查詢店家評價',
                callback_data: 'case3'
            }
            ]
        ]
    });
    let keyboard = {
        reply_markup: JSON.parse(keyboardStr)
    };
    await context.sendMessage(text, keyboard);
}

const processTextMsg = async (context, userInput) => {
    if (userInput === '\/start') {
        try {
            await sendHello(context);
        } catch (error) {
            console.log(error);
        }
    } else if (/^\/m_.*/.test(userInput)) {
        let placeId = new Buffer(userInput.slice(3), 'base64').toString();
        let res = await query.getPlaceDetail(placeId);

        // await context.sendMessage("你選擇了"+ res.name );
        let text = "你選擇了" + res.name;
        let keyboardStr = JSON.stringify({
            inline_keyboard: [
                [{
                    text: '查詢店家資訊',
                    callback_data: `/i_${placeId}`
                },
                {
                    text: '查詢店家位置',
                    callback_data: `/p_${placeId}`
                }
                ]
            ]
        });
        let keyboard = {
            reply_markup: JSON.parse(keyboardStr)
        };
        await context.sendMessage(text, keyboard);
    } else {
        let userInfo = Userlist[context.event.rawEvent.message.chat.id];

        if (userInfo['function'] === 0) {
            if (userInfo['msg'].length === 0) {
                try {
                    await query.getGeocode(userInput);
                    userInfo['msg'].push(userInput); //location
                    await context.sendText("好的，請設定距離(數字+m, e.g. 300m)。");
                } catch (error) {
                    console.log(error);
                    await context.sendText("Try again.");
                    await context.sendText("你在哪呢?");
                }

            } else if (userInfo['msg'].length >= 1) {
                try {
                    userInfo['msg'].push(userInput); //distance
                    let distance = userInput.trim();
                    distance = distance.substring(0, distance.length - 1);
                    let foods = await query.findFoodByLoc(userInfo['msg'][0], distance);
                    await context.sendText(foods);
                } catch (error) {
                    await context.sendText("附近沒有餐廳喔。");
                    await context.sendText("請更換地點。");
                    userInfo['msg'] = [];
                }


            }
        } else if (userInfo['function'] === 1) {
            if (userInfo['msg'].length === 0) {
                try {
                    await query.getGeocode(userInput);
                    userInfo['msg'].push(userInput);
                    await context.sendText("好的，你想找哪家呢？");
                } catch (error) {
                    console.log(error);
                    await context.sendText("Try again.");
                    await context.sendText("你在哪呢?");
                }
            } else if (userInfo['msg'].length >= 1) {
                try {
                    const targetGeoCode = await query.getGeocode(userInfo['msg'][0]);
                    const loc = [targetGeoCode['lat'], targetGeoCode['lng']];
                    let tmp = await query.getPlaceByQueryAndLoc(userInfo['msg'][0] + userInput, loc);
                    console.log(tmp);
                    let res = await query.getPlaceDetail(tmp[0].place_id);
                    const place_id = tmp[0].place_id;

                    let text = "你選擇了" + res.name;
                    let keyboardStr = JSON.stringify({
                        inline_keyboard: [
                            [{
                                text: '查詢店家資訊',
                                callback_data: `/i_${place_id}`
                            },
                            {
                                text: '查詢店家位置',
                                callback_data: `/p_${place_id}`
                            }
                            ]
                        ]
                    });
                    let keyboard = {
                        reply_markup: JSON.parse(keyboardStr)
                    };
                    await context.sendMessage(text, keyboard);
                } catch (error) {
                    console.log(error);
                    await context.sendText("在Google API找不到相關資訊");
                    await context.sendText("請重新開始\n/start");
                }
            }
        } else if (userInfo['function'] === 2) {
            try {
                let tmp = await query.getPlaceByQuery(userInput);
                let res = await query.getPlaceDetail(tmp[0].place_id);
                let ansStr = "";
                ansStr += res.name + "\n";
                ansStr += '平均分數:' + res.rating + query.getStar(res.rating);
                ansStr += "\n\n最近評論:\n";

                let reviews = res.reviews.map((el) => {
                    return {
                        rating: el.rating,
                        text: el.text,
                        time: el.relative_time_description
                    }
                })
                for (i = 0; i < reviews.length; i++) {
                    ansStr += query.getStar(reviews[i].rating) + "\n";
                    ansStr += reviews[i].text + "\n";
                    ansStr += reviews[i].time + "\n\n";
                    if (i > 2) break;
                }
                await context.sendText(ansStr);
            } catch (error) {
                console.log(error);
                await context.sendText("Try Again");
            }
        } else {
            try {
                await sendHello(context);
            } catch (error) {
                console.log(error);
            }
        }
    };
}

const processBtndata = async (context, data) => {
    if (data == "case1") {
        Userlist[context.event.rawEvent.callback_query.from.id] = {};
        Userlist[context.event.rawEvent.callback_query.from.id]['msg'] = [];
        Userlist[context.event.rawEvent.callback_query.from.id]['function'] = 0;
        await context.sendText("收到！那我來幫你!你在哪呢?");
    } else if (data == "case2") {
        Userlist[context.event.rawEvent.callback_query.from.id] = {};
        Userlist[context.event.rawEvent.callback_query.from.id]['msg'] = [];
        Userlist[context.event.rawEvent.callback_query.from.id]['function'] = 1;
        await context.sendText("收到！那我來幫你!你在哪呢?");
    } else if (data == "case3") {
        Userlist[context.event.rawEvent.callback_query.from.id] = {};
        Userlist[context.event.rawEvent.callback_query.from.id]['msg'] = [];
        Userlist[context.event.rawEvent.callback_query.from.id]['function'] = 2;
        await context.sendText("嗨！你想知道哪間的評價?(建議打清楚店家名稱)");
    } else if (/^\/i_.*/.test(data)) {
        Userlist[context.event.rawEvent.callback_query.from.id] = {};
        Userlist[context.event.rawEvent.callback_query.from.id]['msg'] = [];
        Userlist[context.event.rawEvent.callback_query.from.id]['function'] = null;
        let res = await query.getPlaceDetail(data.slice(3));
        let ansStr = "";
        ansStr += res.name + "\n";
        ansStr += query.getStar(res.rating) + "\n\n";
        ansStr += res.formatted_address + "\n";
        ansStr += res.formatted_phone_number + "\n\n";
        if (res.opening_hours !== undefined) {
            for (el of res.opening_hours.weekday_text) {
                ansStr += el + "\n";
            }
        }
        if (res.website !== undefined) {
            ansStr += "\n" + res.website + "\n"
        }

        await context.sendText("ok！以下為" + res.name + "的資訊:\n" + ansStr, {
            parse_mode: 'markdown'
        });
    } else if (/^\/p_.*/.test(data)) {
        let res = await query.getPlaceDetail(data.slice(3));
        Userlist[context.event.rawEvent.callback_query.from.id] = {};
        Userlist[context.event.rawEvent.callback_query.from.id]['msg'] = [];
        Userlist[context.event.rawEvent.callback_query.from.id]['function'] = null;
        await context.sendVenue({
            latitude: res.geometry.location.lat,
            longitude: res.geometry.location.lng,
            title: res.name,
            address: res.formatted_address.replace(/\u865f\u865f/u, '\u865f')
        });
    }
};

//restaurant info
bot.onEvent(async context => {
    //judge if the content is text or not
    if (context.event.isText) {
        let userInput = context.event.message.text;
        await processTextMsg(context, userInput);
    } else if (context.event.isCallbackQuery) {
        // context.event.callbackQuery.data: case1,case2,case3
        let data = context.event.callbackQuery.data;
        await processBtndata(context, data);
        // await context.sendText("Not Found");
    }
});



const server = createServer(bot);

server.listen(5000, () => {
    console.log('server is running on 5000 port...');
});