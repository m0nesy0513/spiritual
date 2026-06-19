import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 获取首页内容（名言、好歌、系统文案）
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const [quotes, songs, contents] = await Promise.all([
      query<any>('SELECT * FROM home_quotes ORDER BY sort_order, id DESC'),
      query<any>('SELECT * FROM home_songs ORDER BY sort_order, id DESC'),
      query<any>('SELECT * FROM admin_contents WHERE deleted_at IS NULL ORDER BY id'),
    ])

    return success({
      quotes: quotes.map((q: any) => ({ id: q.id, text: q.text, author: q.author, isEnabled: !!q.is_enabled, sortOrder: q.sort_order })),
      songs: songs.map((s: any) => ({ id: s.id, title: s.title, artist: s.artist, reason: s.reason, suitableMood: s.suitable_mood, isEnabled: !!s.is_enabled, sortOrder: s.sort_order })),
      contents: contents.map((c: any) => ({ id: c.id, contentType: c.content_type, title: c.title, body: c.body, isEnabled: !!c.is_enabled })),
    })
  } catch (err) { return error(err) }
}

// 更新系统文案
export async function PATCH(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const body = await req.json()
    const { id, title, body: contentBody, isEnabled } = body
    await execute(
      'UPDATE admin_contents SET title = ?, body = ?, is_enabled = ?, updated_at = NOW() WHERE id = ?',
      [title || '', contentBody || '', isEnabled ? 1 : 0, id],
    )
    return success({ saved: true })
  } catch (err) { return error(err) }
}
