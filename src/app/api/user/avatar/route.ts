import { NextRequest } from 'next/server'
import { updateAvatar } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ValidationError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return error(new ValidationError('请选择头像文件'))

    const result = await updateAvatar(Number(userId), file)
    return success(result)
  } catch (err) { return error(err) }
}
