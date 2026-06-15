import { NextRequest } from 'next/server'
import { sendVerificationCode } from '@/server/services/auth.service'
import { success, error } from '@/lib/api-response'
import { ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { targetType, targetValue, purpose } = body

    if (!targetType || !targetValue || !purpose) {
      return error(new ValidationError('参数不完整'))
    }
    if (!['phone', 'email'].includes(targetType)) {
      return error(new ValidationError('凭证类型无效'))
    }
    if (!['register', 'reset_password', 'bind_credential'].includes(purpose)) {
      return error(new ValidationError('无效的验证码用途'))
    }

    const result = await sendVerificationCode({ targetType, targetValue, purpose })
    return success(result)
  } catch (err) {
    return error(err)
  }
}
