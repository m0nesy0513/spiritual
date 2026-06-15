import { NextResponse } from 'next/server'
import { AppError } from '@/lib/errors'

/**
 * 统一成功响应
 */
export function success<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status })
}

/**
 * 统一分页响应
 */
export function paginated<T>(
  items: T[],
  pagination: { page: number; pageSize: number; total: number },
) {
  return NextResponse.json({
    success: true,
    data: { items, pagination },
  })
}

/**
 * 统一错误响应
 */
export function error(err: AppError | Error | unknown) {
  if (err instanceof AppError) {
    return NextResponse.json(err.toJSON(), { status: err.statusCode })
  }

  // 未知错误
  console.error('[Unhandled Error]', err)
  return NextResponse.json(
    {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '出了点问题，请稍后重试',
        details: {},
        canRetry: true,
      },
    },
    { status: 500 },
  )
}

/**
 * 从请求中获取当前用户 ID
 */
export function getUserId(request: Request): string | null {
  const header = request.headers.get('x-user-id')
  return header || null
}

/**
 * 从请求中获取当前 Session
 */
export function getSession(request: Request) {
  return {
    userId: request.headers.get('x-user-id') || '',
    isAdmin: request.headers.get('x-user-is-admin') === 'true',
    username: request.headers.get('x-user-username') || '',
  }
}
