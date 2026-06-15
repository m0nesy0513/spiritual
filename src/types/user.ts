// ============================================
// 用户相关类型
// ============================================

import type { UserInfo, UserCredentialsStatus, UserPreferences } from './auth'

/** 用户完整资料 */
export interface UserProfile {
  id: string
  username: string
  avatarUrl: string | null
  credentials: UserCredentialsStatus
  preferences: UserPreferences
  createdAt: string
}

/** 修改用户名请求 */
export interface UpdateUsernameRequest {
  username: string
}

/** 修改密码请求 */
export interface ChangePasswordRequest {
  oldPassword: string
  newPassword: string
  confirmPassword: string
}

/** 绑定凭证请求 */
export interface BindCredentialRequest {
  credentialType: 'phone' | 'email'
  credentialValue: string
  code: string
}

/** 注销确认请求 */
export interface DeleteAccountRequest {
  confirmText: string
}
