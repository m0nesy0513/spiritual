'use client'

const PLATFORMS = [
  { value: 'wechat_moments', label: '朋友圈', icon: '💬' },
  { value: 'xiaohongshu', label: '小红书', icon: '📕' },
  { value: 'weibo', label: '微博', icon: '📢' },
  { value: 'douyin', label: '抖音', icon: '🎵' },
  { value: 'bilibili', label: 'B 站', icon: '📺' },
  { value: 'other', label: '其他', icon: '📱' },
]

interface PlatformSelectorProps {
  value: string
  onChange: (val: string) => void
}

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  return (
    <div className="space-y-2">
      <span className="text-sm text-gray-500">截图来源平台（可选）</span>
      <div className="grid grid-cols-3 gap-2">
        {PLATFORMS.map((p) => (
          <button
            key={p.value}
            type="button"
            onClick={() => onChange(p.value)}
            className={`py-2.5 rounded-xl text-sm font-medium transition border ${
              value === p.value
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
            }`}
          >
            <span className="mr-1">{p.icon}</span>
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
