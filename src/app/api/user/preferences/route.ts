import { NextRequest } from 'next/server'
import { success, error, getSession } from '@/lib/api-response'
import { query } from '@/lib/db'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const rows = await query<any>(
      'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
      [userId],
    )
    const prefs = rows[0]
    return success({
      referenceHistoryDefault: prefs?.reference_history_default ?? false,
      onboardingCompleted: prefs?.onboarding_completed ?? false,
      tutorialCompleted: prefs?.tutorial_completed ?? false,
    })
  } catch (err) {
    return error(err)
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const body = await req.json()
    const sets: string[] = []
    const params: unknown[] = []

    if (body.referenceHistoryDefault !== undefined) {
      sets.push('reference_history_default = ?')
      params.push(body.referenceHistoryDefault)
    }
    if (body.onboardingCompleted !== undefined) {
      sets.push('onboarding_completed = ?')
      params.push(body.onboardingCompleted)
    }
    if (body.tutorialCompleted !== undefined) {
      sets.push('tutorial_completed = ?')
      params.push(body.tutorialCompleted)
    }

    if (sets.length > 0) {
      await query(
        `UPDATE user_preferences SET ${sets.join(', ')} WHERE user_id = ?`,
        [...params, userId],
      )
    }

    return success(body)
  } catch (err) {
    return error(err)
  }
}
