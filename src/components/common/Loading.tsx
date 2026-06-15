'use client'

interface LoadingProps {
  text?: string
  fullScreen?: boolean
}

export function Loading({ text = '加载中…', fullScreen = false }: LoadingProps) {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 py-16 animate-fade-in-up">
      <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      <p className="text-gray-400 text-sm animate-pulse-soft">{text}</p>
    </div>
  )

  if (fullScreen) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-screen">
        {content}
      </div>
    )
  }

  return content
}

/** 骨架屏 */
export function Skeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`animate-pulse bg-gray-200 rounded-lg ${className}`} />
  )
}

/** 页面骨架 */
export function PageSkeleton({ lines = 5 }: { lines?: number }) {
  return (
    <div className="space-y-4 p-6">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-6 w-1/2" />
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-full" />
      ))}
    </div>
  )
}
