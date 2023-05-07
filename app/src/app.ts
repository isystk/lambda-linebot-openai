import express, { Application, Request, Response } from 'express'
import fetch from 'node-fetch'
import * as line from '@line/bot-sdk'
import * as Types from '@line/bot-sdk/lib/types'
import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai'

const OPENAPI_SECRET = process.env.OPENAPI_SECRET || ''
const CHANNELSECRET = process.env.CHANNELSECRET || ''
const ACCESSTOKEN = process.env.ACCESSTOKEN || ''
const CHATGPT_API = process.env.CHATGPT_API || ''

const app: Application = express()

const clientConfig: line.ClientConfig = {
  channelAccessToken: ACCESSTOKEN,
}
const middlewareConfig: line.MiddlewareConfig = {
  channelSecret: CHANNELSECRET,
}

// LINE SDKのクライアントインスタンスを作成
const client = new line.Client(clientConfig)

app.get('/', (_req: Request, res: Response) => res.send('Hello LINE BOT!(GET)')) //ブラウザ確認用(無くても問題ない)
app.post(
  '/webhook',
  line.middleware(middlewareConfig),
  async (req: Request, res: Response) => {
    try {
      // イベントオブジェクトを取得
      const event: line.WebhookEvent = req.body.events[0]

      if (event.type !== 'message' || event.message.type !== 'text') {
        // テキストメッセージでない場合は何もしない
        return
      }
      let replyUser
      if (event.source.type === "group") {
        const botInfo = await client.getBotInfo()
        if (!event.message.text.match(new RegExp(botInfo.displayName + "\\s*", "s"))) {
          // グループチャットの場合は、メンションがついていない場合は何もしない
          return 
        }
        replyUser = event.source.userId;
      }

      // テキストメッセージの場合
      let message
      if (CHATGPT_API) {
        const userId = event.source.userId
        if (!userId) {
          throw new Error('An unexpected error has occurred.')
        }

        // オリジナルAPIにリクエストとします。
        const data = await callOriginalApi(event.message.text, userId)
        message = data.message
        
      } else {

        // OpenAIにリクエストします
        const reply = await callOpenai([
          { role: 'user', content: event.message.text },
        ])
        if (!reply) {
          throw new Error('An unexpected error occurred.')
        }
        message = reply
      }

      if (replyUser) {
        message = `@${replyUser} ${message}`
      }

      // メッセージを返信する
      await client.replyMessage(event.replyToken, {
        type: 'text',
        text: message,
      } as Types.Message)

      res.sendStatus(200)
    } catch (e) {
      console.log('error', e)
      res.sendStatus(500)
    }
  }
)

// OpenAIにリクエストします。
const callOpenai = async (mentionMessages: Record<never, never>[]) => {
  const configuration = new Configuration({
    apiKey: OPENAPI_SECRET,
  })
  const openai = new OpenAIApi(configuration)
  const messages = [
    {
      role: ChatCompletionRequestMessageRoleEnum.System,
      content: 'あなたは有能なアシスタントです。',
    },
    ...mentionMessages,
  ]
  console.log('request to openai:', messages)
  // Chat completions APIを呼ぶ
  const response = await openai.createChatCompletion({
    model: 'gpt-3.5-turbo',
    // @ts-ignore
    messages,
  })
  const message = response.data.choices[0]?.message?.content
  console.log('response from openai:', message)
  return message
}

const callOriginalApi = async (message: string, userId: string) => {
  const body = JSON.stringify({
    appId: 'lambda-linebot-openai',
    sessionTime: 10 * 60 * 1000, // セッションを10分に指定
    userKey: userId,
    message: message,
  })
  const response = await fetch(CHATGPT_API, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,PUT,POST,DELETE',
      'Access-Control-Allow-Headers':
        'Content-Type, Authorization, access_token',
    },
    body,
  })
  const text = await response.text();
  const json: {status: number, message: string} = JSON.parse(text);
  return json;
}

export { app }
