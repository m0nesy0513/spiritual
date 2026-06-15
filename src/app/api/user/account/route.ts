import { NextRequest } from 'next/server'
import { deleteAccount } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { clearTokenCookie } from '@/lib/cookie'
import { UnauthorizedError } from '@/lib/errors'

export async function DELETE(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const result = await deleteAccount(Number(userId))

    await clearTokenCookie()
    return success(result)
  } catch (err) { return error(err) }
}
