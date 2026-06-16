import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const body = await req.json()
    const { action } = body

    if (!['continue_view', 'return_home'].includes(action)) {
      return error(new ValidationError('无效的操作'))
    }

    // 校验记录归属
    const rows = await query<any>(
      `SELECT ar.id FROM analysis_records ar
       WHERE ar.record_public_id = ? AND ar.user_id = ? LIMIT 1`,
      [recordId, userId],
    )
    if (rows.length === 0) return error(new ForbiddenError())

    await query(
      `UPDATE analysis_risk_states SET risk_status = 'handled', handled_at = NOW(), handled_action = ?
       WHERE record_id = ?`,
      [action, rows[0].id],
    )

    const nextPage = action === 'return_home' ? '/home' : `/analysis/${recordId}`
    return success({ riskStatus: 'handled', nextPage })
  } catch (err) {
    return error(err)
  }
}
