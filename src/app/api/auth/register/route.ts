import { NextRequest } from 'next/server'
import { register } from '@/server/services/auth.service'
import { success, error } from '@/lib/api-response'
import { setTokenCookie } from '@/lib/cookie'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { credentialType, credentialValue, code, password, username, agreedToTermsAndPrivacy, confirmedDisclaimer } = body

    const result = await register({
      credentialType,
      credentialValue,
      code,
      password,
      username,
      agreedToTermsAndPrivacy,
      confirmedDisclaimer,
    })

    await setTokenCookie(result.token)
    return success({ user: result.user, nextPage: result.nextPage })
  } catch (err) {
    return error(err)
  }
}
