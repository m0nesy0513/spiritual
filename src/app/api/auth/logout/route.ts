import { success } from '@/lib/api-response'
import { clearTokenCookie } from '@/lib/cookie'

export async function POST() {
  await clearTokenCookie()
  return success({ loggedOut: true })
}
