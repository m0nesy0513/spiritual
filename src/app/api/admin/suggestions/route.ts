import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = 20
    const offset = (page - 1) * pageSize

    const [rows, countRows] = await Promise.all([
      query<any>(
        `SELECT * FROM user_suggestions ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [pageSize, offset],
      ),
      query<any>('SELECT COUNT(*) as total FROM user_suggestions'),
    ])

    return success({
      suggestions: rows.map((r: any) => ({
        id: r.id,
        type: r.suggestion_type,
        content: r.content,
        contact: r.contact_text || '',
        status: r.status,
        displayName: r.submitter_display_snapshot || '',
        createdAt: r.created_at,
      })),
      pagination: { page, pageSize, total: countRows[0]?.total || 0 },
    })
  } catch (err) { return error(err) }
}
