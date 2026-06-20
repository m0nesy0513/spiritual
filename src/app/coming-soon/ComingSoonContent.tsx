'use client'

import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { COMING_SOON_FEATURES, type FeatureMeta } from '@/config/features'

const STATUS_COLORS: Record<FeatureMeta['status'], string> = {
  '规划中': 'bg-gray-100 text-gray-600',
  '开发中': 'bg-amber-100 text-amber-700',
  '内测中': 'bg-blue-100 text-blue-700',
}

const DEFAULT: FeatureMeta = {
  key: '',
  title: '新功能',
  icon: '✨',
  description: '更多实用功能正在规划中，敬请期待。',
  status: '规划中',
}

export function ComingSoonContent() {
  const searchParams = useSearchParams()
  const featureKey = searchParams.get('feature') || ''
  const feature = COMING_SOON_FEATURES[featureKey] || DEFAULT

  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center px-6 text-center">
      {/* Icon */}
      <div className="size-24 rounded-full bg-amber-100 flex items-center justify-center mb-6">
        <span className="text-5xl">{feature.icon}</span>
      </div>

      {/* Status badge */}
      <span className={`text-xs font-medium px-3 py-1 rounded-full mb-3 ${STATUS_COLORS[feature.status]}`}>
        {feature.status}
      </span>

      {/* Title */}
      <h1 className="text-xl font-bold text-gray-800 mb-3">{feature.title}</h1>

      {/* Description */}
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">{feature.description}</p>

      {/* Buttons */}
      <div className="flex flex-col gap-3 w-full max-w-xs">
        <Link href="/home" className="btn-primary text-center">
          返回首页
        </Link>
        <Link href="/features" className="btn-secondary text-center">
          ← 查看全部功能
        </Link>
      </div>
    </div>
  )
}
