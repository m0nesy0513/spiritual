import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 管理员列表
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const rows = await query<any>(
      `SELECT au.id, au.user_id, au.role, au.created_at, u.username
       FROM admin_users au JOIN users u ON u.id = au.user_id
       ORDER BY au.created_at DESC`,
    )

    return success({
      admins: rows.map((r: any) => ({
        id: r.id,
        userId: r.user_id,
        username: r.username,
        role: r.role,
        createdAt: r.created_at,
      })),
    })
  } catch (err) { return error(err) }
}

// 添加管理员
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const { credentialType, credentialValue } = await req.json()

    // 根据手机号或邮箱查找用户
    const users = await query<any>(
      `SELECT u.id, u.username FROM users u
       JOIN user_credentials uc ON uc.user_id = u.id
       WHERE uc.credential_type = ? AND uc.credential_value = ? LIMIT 1`,
      [credentialType, credentialValue],
    )
    if (users.length === 0) return error({ statusCode: 404, code: 'NOT_FOUND', message: '未找到该用户' } as any)

    const user = users[0]

    // 检查是否已是管理员
    const [existing] = await query<any>(
      'SELECT id FROM admin_users WHERE user_id = ? LIMIT 1',
      [user.id],
    )
    if (existing) return success({ message: `${user.username} 已是管理员`, existed: true })

    await execute(
      'INSERT INTO admin_users (user_id, role) VALUES (?, ?)',
      [user.id, 'admin'],
    )

    return success({ username: user.username, userId: user.id, saved: true })
  } catch (err) { return error(err) }
}

// 移除管理员
export async function DELETE(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const url = new URL(req.url)
    const userId = parseInt(url.searchParams.get('userId') || '0', 10)
    if (!userId) return error({ statusCode: 400, code: 'VALIDATION', message: '缺少用户ID' } as any)

    // 不允许删除自己
    if (userId === Number(session.userId)) {
      return error({ statusCode: 400, code: 'VALIDATION', message: '不能移除自己的管理员权限' } as any)
    }

    await execute('DELETE FROM admin_users WHERE user_id = ?', [userId])
    return success({ deleted: true })
  } catch (err) { return error(err) }
}
