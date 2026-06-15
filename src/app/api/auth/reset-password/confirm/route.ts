import { NextRequest } from 'next/server'
import { resetPasswordConfirm } from '@/server/services/auth.service'
import { success, error } from '@/lib/api-response'
import { verifyToken } from '@/lib/auth'
import { ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { resetToken, newPassword, confirmPassword } = body

    const payload = await verifyToken(resetToken)
    if (!payload) {
      return error(new ValidationError('重置链接已过期，请重新操作'))
    }

    const result = await resetPasswordConfirm({
      resetToken,
      newPassword,
      confirmPassword,
      userId: Number(payload.userId),
    })

    return success(result)
  } catch (err) {
    return error(err)
  }
}
