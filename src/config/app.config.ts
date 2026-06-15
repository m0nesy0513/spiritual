/**
 * 应用全局配置
 */
export const appConfig = {
  site: {
    name: process.env.SITE_NAME || '精神避难所',
    url: process.env.SITE_URL || 'http://localhost:3000',
    slogan: '今天想聊聊哪条截图？',
  },

  auth: {
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-me',
    sessionMaxAge: parseInt(process.env.SESSION_MAX_AGE || '604800', 10), // 7 天
    passwordMinLength: 8,
    requireLetterAndNumber: true,
  },

  upload: {
    maxSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '10', 10),
    allowedImageTypes: ['image/png', 'image/jpeg', 'image/webp'],
    allowedExtensions: ['.png', '.jpg', '.jpeg', '.webp'],
    uploadDir: process.env.UPLOAD_DIR || 'uploads',
  },

  analysis: {
    timeoutMs: 60_000, // 60 秒超时
    maxRetries: 2,
  },

  verification: {
    codeExpirySeconds: 300, // 5 分钟
    resendCooldownSeconds: 60, // 60 秒冷却
    skipVerification: process.env.SKIP_VERIFICATION === 'true', // 内测阶段跳过
  },

  knowledge: {
    minTotalItems: 60,
    minItemsPerCategory: 3,
    injectCountMin: 5,
    injectCountMax: 8,
  },

  features: {
    emotionRoom: false,
    longTermReview: false,
    achievementWall: false,
    anxietyArchive: false,
    share: false,
    export: false,
  },
} as const
