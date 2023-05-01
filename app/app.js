import express from 'express';
import line from "@line/bot-sdk";
import { Configuration, OpenAIApi, ChatCompletionRequestMessageRoleEnum } from "openai";

const OPENAPI_CHAT_COMPLETIONS_API = 'https://api.openai.com/v1/chat/completions'
const OPENAPI_SECRET = process.env.OPENAPI_SECRET;
const CHANNELSECRET = process.env.CHANNELSECRET;
const ACCESSTOKEN = process.env.ACCESSTOKEN;

const app = express();

const config = {
    channelSecret: CHANNELSECRET,
    channelAccessToken: ACCESSTOKEN
};

// LINE SDKのクライアントインスタンスを作成
const client = new line.Client(config);

app.get('/', (req, res) => res.send('Hello LINE BOT!(GET)')); //ブラウザ確認用(無くても問題ない)
app.post('/webhook', line.middleware(config), async (req, res) => {
    console.log("start");

    try {
        // イベントオブジェクトを取得
        const event = req.body.events[0];
      
        // テキストメッセージの場合のみオウム返しをする
        if (event.type === 'message' && event.message.type === 'text') {

            // OpenAIにリクエストします
            const reply = await callOpenai([{ role: 'user', content: event.message.text }]);
        
            // オウム返しするメッセージを返信する
            await client.replyMessage(event.replyToken, { type: 'text', text: reply });
        }
        
        console.log("success");
        res.sendStatus(200);
    } catch (e) {
        console.log("error", e);
        res.sendStatus(500);
    }
});

// OpenAIにリクエストします。
const callOpenai = async (mentionMessages) => {
    const configuration = new Configuration({
        apiKey: process.env.OPENAPI_SECRET
    });
    const openai = new OpenAIApi(configuration);
    const messages = [
        {
            role: ChatCompletionRequestMessageRoleEnum.System,
            content: "あなたは有能なアシスタントです。",
        },
        ...mentionMessages,
    ];
    console.log('request to openai:', messages)
    // Chat completions APIを呼ぶ
    const response = await openai.createChatCompletion({
        model: "gpt-3.5-turbo",
        messages,
    });
    const message = response.data.choices[0].message?.content;
    console.log('response from openai:', message)
    return message
}

export {app} 
