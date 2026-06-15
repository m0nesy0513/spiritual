export const aiConfig = {
  provider: 'deepseek' as const,

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    maxTokens: 4096,
    temperature: 0.7,
  },

  /** 分析超时（毫秒） */
  timeoutMs: 60_000,

  /** 最大重试次数 */
  maxRetries: 2,
} as const
