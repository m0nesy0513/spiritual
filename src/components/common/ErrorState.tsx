'use client'

interface ErrorStateProps {
  title?: string
  message?: string
  onRetry?: () => void
  onGoHome?: () => void
  retryLabel?: string
}

export function ErrorState({
  title = '出了点问题',
  message = '请稍后重试',
  onRetry,
  onGoHome,
  retryLabel = '重试',
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6 animate-fade-in-up">
      <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center">
        <span className="text-3xl">😔</span>
      </div>
      <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
      <p className="text-gray-400 text-sm text-center">{message}</p>
      <div className="flex gap-3 mt-2">
        {onRetry && (
          <button onClick={onRetry} className="btn-primary text-sm px-6">
            {retryLabel}
          </button>
        )}
        {onGoHome && (
          <button onClick={onGoHome} className="btn-secondary text-sm px-6">
            返回首页
          </button>
        )}
      </div>
    </div>
  )
}
