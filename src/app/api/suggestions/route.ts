import { NextRequest } from 'next/server'
import { execute } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())

    const { type, content, contact } = await req.json()
    await execute(
      `INSERT INTO user_suggestions (user_id, suggestion_type, content, contact_text, submitter_display_snapshot)
       VALUES (?, ?, ?, ?, ?)`,
      [Number(session.userId), type || 'other', content || '', contact?.slice(0, 100) || null, session.username],
    )

    return success({ submitted: true })
  } catch (err) { return error(err) }
}
