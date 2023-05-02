import express, { Application, Request, Response } from 'express'
import * as line from '@line/bot-sdk'
import * as Types from "@line/bot-sdk/lib/types";
import {
  Configuration,
  OpenAIApi,
  ChatCompletionRequestMessageRoleEnum,
} from 'openai'

const OPENAPI_SECRET = process.env.OPENAPI_SECRET || ''
const CHANNELSECRET = process.env.CHANNELSECRET || ''
const ACCESSTOKEN = process.env.ACCESSTOKEN || ''

const app: Application = express()
// app.use(express.urlencoded({ extended: true }))
// app.use(express.json())
// app.use(cors())

const clientConfig: line.ClientConfig= {
  channelAccessToken: ACCESSTOKEN,
}
const middlewareConfig: line.MiddlewareConfig= {
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

      // テキストメッセージの場合のみオウム返しをする
      if (event.type === 'message' && event.message.type === 'text') {
        // OpenAIにリクエストします
        const reply = await callOpenai([
          { role: 'user', content: event.message.text },
        ])
        if (!reply) {
          throw new Error('An unexpected error occurred.')
        }

        // オウム返しするメッセージを返信する
        await client.replyMessage(event.replyToken, {
          type: 'text',
          text: reply,
        } as Types.Message)
      }

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

export { app }
