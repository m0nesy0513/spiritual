import { NextRequest } from 'next/server'
import { changePassword } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { oldPassword, newPassword, confirmPassword } = await req.json()
    const result = await changePassword(Number(userId), oldPassword, newPassword, confirmPassword)
    return success(result)
  } catch (err) { return error(err) }
}
