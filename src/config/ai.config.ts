export const aiConfig = {
  provider: 'deepseek' as const,

  deepseek: {
    apiKey: process.env.DEEPSEEK_API_KEY || '',
    baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com',
    model: process.env.DEEPSEEK_MODEL || 'deepseek-chat',
    /** API 路径，DeepSeek 用 /v1/chat/completions，智谱用 /chat/completions */
    chatPath: process.env.AI_CHAT_PATH || '/v1/chat/completions',
    maxTokens: 4096,
    temperature: 0.7,
  },

  /** 分析超时（毫秒） */
  timeoutMs: 120_000,

  /** 最大重试次数 */
  maxRetries: 2,
} as const
