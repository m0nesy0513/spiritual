import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    // 获取问候语
    const greetRows = await query<any>(
      "SELECT body FROM admin_contents WHERE content_type = 'greeting' AND is_enabled = TRUE LIMIT 1",
    )
    const greeting = greetRows[0]?.body || '今天想聊聊哪条截图？'

    // 随机取 1 条已启用名言
    const quoteRows = await query<any>(
      'SELECT text, author FROM home_quotes WHERE is_enabled = TRUE ORDER BY RAND() LIMIT 1',
    )
    const quote = quoteRows[0]
      ? { text: quoteRows[0].text, author: quoteRows[0].author, placeholder: false }
      : { text: '名言正在准备中', author: '', placeholder: true }

    // 随机取 1 首已启用好歌
    const songRows = await query<any>(
      'SELECT title, artist, reason, suitable_mood FROM home_songs WHERE is_enabled = TRUE ORDER BY RAND() LIMIT 1',
    )
    const song = songRows[0]
      ? { title: songRows[0].title, artist: songRows[0].artist, reason: songRows[0].reason, suitableMood: songRows[0].suitable_mood, placeholder: false }
      : { title: '', artist: '', reason: '今日推荐正在准备中', suitableMood: '', placeholder: true }

    // 检查用户是否有历史记录（影响参考历史开关可用性）
    const historyRows = await query<any>(
      'SELECT COUNT(*) as cnt FROM analysis_records WHERE user_id = ?',
      [userId],
    )
    const hasHistory = historyRows[0].cnt > 0

    return success({
      greeting: { text: greeting },
      quote,
      song,
      userState: { isLoggedIn: true, hasHistory },
    })
  } catch (err) {
    return error(err)
  }
}
