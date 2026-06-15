'use client'

interface EmptyStateProps {
  icon?: string
  title: string
  description?: string
  actionLabel?: string
  onAction?: () => void
}

export function EmptyState({
  icon = '📭',
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 px-6 animate-fade-in-up">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-600">{title}</h3>
      {description && (
        <p className="text-gray-400 text-sm text-center">{description}</p>
      )}
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn-primary text-sm px-6 mt-2">
          {actionLabel}
        </button>
      )}
    </div>
  )
}
