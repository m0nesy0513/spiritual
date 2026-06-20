export const authConfig = {
  /** 密码最小长度 */
  passwordMinLength: 8,

  /** 密码必须包含字母和数字 */
  requireLetterAndNumber: true,

  /** 用户名最大长度 */
  usernameMaxLength: 20,

  /** 用户名允许的字符模式 */
  usernamePattern: /^[一-鿿A-Za-z0-9_]+$/,

  /** JWT 过期时间 */
  jwtExpiresIn: '7d',

  /** Cookie 名称 */
  cookieName: 'spiritual_refuge_token',

  /** Cookie 配置 */
  cookieOptions: {
    httpOnly: true,
    secure: false, // TODO: 配好 HTTPS 后改为 true
    sameSite: 'lax' as const,
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 天
  },
} as const
