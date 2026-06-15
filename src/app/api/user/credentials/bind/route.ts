import { NextRequest } from 'next/server'
import { bindCredential } from '@/server/services/user.service'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { credentialType, credentialValue, code } = await req.json()
    const result = await bindCredential(Number(userId), credentialType, credentialValue, code)
    return success(result)
  } catch (err) { return error(err) }
}
