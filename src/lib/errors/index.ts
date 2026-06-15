/**
 * 统一错误类型定义
 */

export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode: number = 500,
    public details?: Record<string, unknown>,
    public canRetry: boolean = false,
  ) {
    super(message)
    this.name = 'AppError'
  }

  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.message,
        details: this.details || {},
        canRetry: this.canRetry,
      },
    }
  }
}

// --- 认证错误 ---
export class UnauthorizedError extends AppError {
  constructor(message = '请先登录') {
    super('UNAUTHORIZED', message, 401)
  }
}

export class ForbiddenError extends AppError {
  constructor(message = '无权限访问该资源') {
    super('FORBIDDEN', message, 403)
  }
}

export class NotFoundError extends AppError {
  constructor(message = '资源不存在') {
    super('NOT_FOUND', message, 404)
  }
}

// --- 校验错误 ---
export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details)
  }
}

// --- 限流错误 ---
export class RateLimitedError extends AppError {
  constructor(message = '操作太频繁，请稍后再试', retryAfterMs?: number) {
    super('RATE_LIMITED', message, 429, { retryAfterMs })
  }
}

// --- AI 分析错误 ---
export class AIAnalysisError extends AppError {
  constructor(message = '分析失败，请稍后重试', canRetry = true) {
    super('AI_ANALYSIS_FAILED', message, 500, { canRetry }, canRetry)
  }
}

// --- 上传错误 ---
export class UploadError extends AppError {
  constructor(code: string, message: string, statusCode = 400) {
    super(code, message, statusCode)
  }
}

// --- 登录态失效 ---
export class SessionExpiredError extends AppError {
  constructor(message = '登录已过期，请重新登录') {
    super('SESSION_EXPIRED', message, 401)
  }
}
