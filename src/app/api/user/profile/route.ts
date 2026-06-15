import { NextRequest } from 'next/server'
import { getProfile } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())
    return success(await getProfile(Number(userId)))
  } catch (err) { return error(err) }
}
