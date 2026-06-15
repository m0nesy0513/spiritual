import { SignJWT, jwtVerify } from 'jose'
import { authConfig } from '@/config/auth.config'

const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'dev-secret-change-me'
)

export interface SessionPayload {
  userId: string
  isAdmin: boolean
  username: string
}

/**
 * 签发 JWT Token
 */
export async function signToken(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(authConfig.jwtExpiresIn)
    .sign(secret)
}

/**
 * 验证 JWT Token
 */
export async function verifyToken(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as SessionPayload
  } catch {
    return null
  }
}

/**
 * 生成密码哈希
 */
export async function hashPassword(password: string): Promise<string> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.hash(password, 12)
}

/**
 * 验证密码
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  const bcrypt = await import('bcryptjs')
  return bcrypt.compare(password, hash)
}

/**
 * 校验密码规则
 */
export function validatePassword(password: string): { valid: boolean; message?: string } {
  if (!password || password.length < authConfig.passwordMinLength) {
    return { valid: false, message: `密码至少 ${authConfig.passwordMinLength} 位` }
  }
  if (authConfig.requireLetterAndNumber) {
    if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
      return { valid: false, message: '密码需包含字母和数字' }
    }
  }
  return { valid: true }
}

/**
 * 校验用户名
 */
export function validateUsername(username: string): { valid: boolean; message?: string } {
  if (!username || !username.trim()) {
    return { valid: false, message: '用户名不能为空' }
  }
  if (username.trim().length === 0) {
    return { valid: false, message: '用户名不能为纯空格' }
  }
  if (username.length > authConfig.usernameMaxLength) {
    return { valid: false, message: `用户名最多 ${authConfig.usernameMaxLength} 字` }
  }
  if (!authConfig.usernamePattern.test(username)) {
    return { valid: false, message: '用户名只能包含中文、英文、数字和下划线' }
  }
  return { valid: true }
}
