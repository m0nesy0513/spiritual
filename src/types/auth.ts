// ============================================
// 用户与认证相关类型
// ============================================

/** 登录凭证类型 */
export type CredentialType = 'phone' | 'email'

/** 注册请求 */
export interface RegisterRequest {
  credentialType: CredentialType
  credentialValue: string
  code: string
  password: string
  username: string
  agreedToTermsAndPrivacy: boolean
  confirmedDisclaimer: boolean
}

/** 登录请求 */
export interface LoginRequest {
  credentialType: CredentialType
  credentialValue: string
  password: string
}

/** 用户基本信息 */
export interface UserInfo {
  id: string
  username: string
  avatarUrl: string | null
  isAdmin: boolean
  onboardingCompleted: boolean
  tutorialCompleted: boolean
  createdAt: string
}

/** 用户凭证绑定状态 */
export interface UserCredentialsStatus {
  phoneBound: boolean
  emailBound: boolean
}

/** 用户偏好 */
export interface UserPreferences {
  referenceHistoryDefault: boolean
  onboardingCompleted: boolean
  tutorialCompleted: boolean
}

/** 搜索验证码用途 */
export type VerificationPurpose = 'register' | 'reset_password' | 'bind_credential'

/** 发送验证码请求 */
export interface SendCodeRequest {
  targetType: CredentialType
  targetValue: string
  purpose: VerificationPurpose
}
