import { cookies } from 'next/headers'
import { authConfig } from '@/config/auth.config'

/**
 * 设置登录 Token Cookie
 */
export async function setTokenCookie(token: string) {
  const cookieStore = await cookies()
  cookieStore.set(authConfig.cookieName, token, authConfig.cookieOptions)
}

/**
 * 清除登录 Token Cookie
 */
export async function clearTokenCookie() {
  const cookieStore = await cookies()
  cookieStore.delete(authConfig.cookieName)
}
