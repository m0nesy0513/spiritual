import { NextRequest } from 'next/server'
import { getMe } from '@/server/services/auth.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const user = await getMe(Number(userId))
    return success({ user })
  } catch (err) {
    return error(err)
  }
}
