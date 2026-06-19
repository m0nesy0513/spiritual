import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 新建名言
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const { text, author, isEnabled } = await req.json()
    const [res] = await execute(
      'INSERT INTO home_quotes (text, author, is_enabled) VALUES (?, ?, ?)',
      [text?.slice(0, 50) || '', author?.slice(0, 50) || '', isEnabled ? 1 : 0],
    ) as any
    return success({ id: res.insertId, saved: true })
  } catch (err) { return error(err) }
}

// 更新/删除名言
export async function PATCH(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const { id, text, author, isEnabled } = await req.json()
    await execute(
      'UPDATE home_quotes SET text=?, author=?, is_enabled=?, updated_at=NOW() WHERE id=?',
      [text?.slice(0, 50) || '', author?.slice(0, 50) || '', isEnabled ? 1 : 0, id],
    )
    return success({ saved: true })
  } catch (err) { return error(err) }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const url = new URL(req.url)
    const id = parseInt(url.searchParams.get('id') || '0', 10)
    if (id > 0) await execute('DELETE FROM home_quotes WHERE id = ?', [id])
    return success({ deleted: true })
  } catch (err) { return error(err) }
}
