import { NextRequest } from 'next/server'
import { login } from '@/server/services/auth.service'
import { success, error } from '@/lib/api-response'
import { setTokenCookie } from '@/lib/cookie'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { credentialType, credentialValue, password } = body

    const result = await login({ credentialType, credentialValue, password })

    await setTokenCookie(result.token)
    return success({ user: result.user, nextPage: result.nextPage })
  } catch (err) {
    return error(err)
  }
}
