import { NextRequest } from 'next/server'
import { updateUsername } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function PATCH(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())
    const { username } = await req.json()
    const result = await updateUsername(Number(userId), username)
    return success(result)
  } catch (err) { return error(err) }
}
