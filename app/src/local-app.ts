import 'dotenv/config.js'
import { app } from './app'

// ローカル起動時に実行するコード
;(async () => {
  await app.listen(process.env.PORT || 3000)
})()
