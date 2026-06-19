import { transaction, query } from '@/lib/db'
import { hashPassword, comparePassword, signToken, validatePassword, validateUsername } from '@/lib/auth'
import { UserRepo } from '@/server/repositories/user.repo'
import { VerificationRepo } from '@/server/repositories/verification.repo'
import { ValidationError, UnauthorizedError, RateLimitedError } from '@/lib/errors'
import type { PoolConnection } from 'mysql2/promise'

async function getIsAdmin(userId: number): Promise<boolean> {
  const rows = await query<any>('SELECT 1 FROM admin_users WHERE user_id = ? LIMIT 1', [userId])
  return rows.length > 0
}

// ============================================
// 发送验证码
// ============================================
export async function sendVerificationCode(params: {
  targetType: 'phone' | 'email'
  targetValue: string
  purpose: 'register' | 'reset_password' | 'bind_credential'
}) {
  const { targetType, targetValue, purpose } = params

  // 校验冷却
  const inCooldown = await VerificationRepo.isInCooldown(targetType, targetValue, purpose)
  if (inCooldown) {
    throw new RateLimitedError('发送太频繁，请 60 秒后再试', 60_000)
  }

  // 注册场景：检查账号是否已存在
  if (purpose === 'register') {
    const existing = await UserRepo.findByCredential(targetType, targetValue)
    if (existing) {
      throw new ValidationError('该账号已注册')
    }
  }

  // 找回密码场景：检查账号是否存在
  if (purpose === 'reset_password') {
    const existing = await UserRepo.findByCredential(targetType, targetValue)
    if (!existing) {
      throw new ValidationError('该账号不存在，请先注册')
    }
  }

  const code = await VerificationRepo.create(targetType, targetValue, purpose)

  // 内测模式：返回验证码明文供调试
  if (process.env.SKIP_VERIFICATION === 'true') {
    return { expiresIn: 300, resendAfter: 60, code }
  }

  // TODO: 接入真实短信/邮件发送
  return { expiresIn: 300, resendAfter: 60 }
}

// ============================================
// 注册
// ============================================
export async function register(params: {
  credentialType: 'phone' | 'email'
  credentialValue: string
  code: string
  password: string
  username: string
  agreedToTermsAndPrivacy: boolean
  confirmedDisclaimer: boolean
}) {
  const { credentialType, credentialValue, code, password, username } = params

  // 校验协议确认
  if (!params.agreedToTermsAndPrivacy) {
    throw new ValidationError('请同意用户协议和隐私政策')
  }
  if (!params.confirmedDisclaimer) {
    throw new ValidationError('请确认已阅读免责声明')
  }

  // 校验验证码
  const codeValid = await VerificationRepo.verify(credentialType, credentialValue, 'register', code)
  if (!codeValid) {
    throw new ValidationError('验证码错误或已过期')
  }

  // 校验密码
  const pwCheck = validatePassword(password)
  if (!pwCheck.valid) {
    throw new ValidationError(pwCheck.message!)
  }

  // 校验用户名
  const unCheck = validateUsername(username)
  if (!unCheck.valid) {
    throw new ValidationError(unCheck.message!)
  }

  // 检查是否已注册
  const existing = await UserRepo.findByCredential(credentialType, credentialValue)
  if (existing) {
    throw new ValidationError('该账号已注册')
  }

  // 事务写入
  const passwordHash = await hashPassword(password)

  const result = await transaction(async (conn: PoolConnection) => {
    const userId = await UserRepo.createUser(conn, username)
    await UserRepo.createCredential(conn, userId, credentialType, credentialValue, passwordHash, true)
    await UserRepo.createPreferences(conn, userId)
    await UserRepo.createComplianceConfirmation(conn, userId, 'terms_and_privacy')
    await UserRepo.createComplianceConfirmation(conn, userId, 'disclaimer')
    return userId
  })

  // 自动登录 → 签发 Token
  const isAdmin = await getIsAdmin(result)
  const token = await signToken({
    userId: String(result),
    isAdmin,
    username,
  })

  return {
    user: {
      id: String(result),
      username,
      avatarUrl: null,
      isAdmin,
      onboardingCompleted: false,
      tutorialCompleted: false,
    },
    nextPage: '/onboarding',
    token,
  }
}

// ============================================
// 登录
// ============================================
export async function login(params: {
  credentialType: 'phone' | 'email'
  credentialValue: string
  password: string
}) {
  const { credentialType, credentialValue, password } = params

  const cred = await UserRepo.findByCredential(credentialType, credentialValue)
  if (!cred) {
    throw new UnauthorizedError('账号或密码错误')
  }

  const passwordOk = await comparePassword(password, cred.password_hash)
  if (!passwordOk) {
    throw new UnauthorizedError('账号或密码错误')
  }

  const user = await UserRepo.findUserById(cred.user_id)
  if (!user) {
    throw new UnauthorizedError('用户不存在')
  }

  const prefs = await UserRepo.getPreferences(cred.user_id)

  const isAdmin = await getIsAdmin(user.id)
  const token = await signToken({
    userId: String(user.id),
    isAdmin,
    username: user.username,
  })

  return {
    user: {
      id: String(user.id),
      username: user.username,
      avatarUrl: null,
      isAdmin,
      onboardingCompleted: prefs?.onboarding_completed ?? false,
      tutorialCompleted: prefs?.tutorial_completed ?? false,
    },
    nextPage: prefs?.onboarding_completed ? '/home' : '/onboarding',
    token,
  }
}

// ============================================
// 获取当前用户
// ============================================
export async function getMe(userId: number) {
  const user = await UserRepo.findUserById(userId)
  if (!user) throw new UnauthorizedError('用户不存在')
  const prefs = await UserRepo.getPreferences(userId)
  const isAdmin = await getIsAdmin(userId)

  return {
    id: String(user.id),
    username: user.username,
    avatarUrl: null,
    isAdmin,
    onboardingCompleted: prefs?.onboarding_completed ?? false,
    tutorialCompleted: prefs?.tutorial_completed ?? false,
    preferences: {
      referenceHistoryDefault: prefs?.reference_history_default ?? false,
    },
  }
}

// ============================================
// 找回密码：验证凭证
// ============================================
export async function resetPasswordVerify(params: {
  credentialType: 'phone' | 'email'
  credentialValue: string
  code: string
}) {
  const { credentialType, credentialValue, code } = params

  const cred = await UserRepo.findByCredential(credentialType, credentialValue)
  if (!cred) {
    throw new ValidationError('该账号不存在，请先注册')
  }

  const codeValid = await VerificationRepo.verify(credentialType, credentialValue, 'reset_password', code)
  if (!codeValid) {
    throw new ValidationError('验证码错误或已过期')
  }

  // 生成短期重置 Token（简化版：用 JWT 承载）
  const resetToken = await signToken({
    userId: String(cred.user_id),
    isAdmin: false,
    username: '',
  })

  return { resetToken, expiresIn: 600 }
}

// ============================================
// 找回密码：设置新密码
// ============================================
export async function resetPasswordConfirm(params: {
  resetToken: string
  newPassword: string
  confirmPassword: string
  userId: number
}) {
  const { newPassword, confirmPassword, userId } = params

  if (newPassword !== confirmPassword) {
    throw new ValidationError('两次密码输入不一致')
  }

  const pwCheck = validatePassword(newPassword)
  if (!pwCheck.valid) {
    throw new ValidationError(pwCheck.message!)
  }

  const newHash = await hashPassword(newPassword)
  await UserRepo.updatePassword(userId, newHash)

  return { passwordReset: true, nextPage: '/login' }
}
