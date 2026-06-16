'use client'

import { usePathname } from 'next/navigation'

const NAV_ITEMS = [
  { href: '/home', label: '首页', icon: '🏠' },
  { href: '/features', label: '功能', icon: '🧭' },
  { href: '/upload', label: '', icon: '📷', isCamera: true },
  { href: '/knowledge', label: '百宝箱', icon: '📚' },
  { href: '/profile', label: '我的', icon: '👤' },
]

export function BottomNav() {
  const pathname = usePathname()

  // 仅在需要展示底部导航的页面显示
  const shouldShow = ['/home', '/features', '/upload', '/knowledge', '/profile', '/history'].some(
    (p) => pathname === p || pathname.startsWith(p + '/'),
  )

  if (!shouldShow) return null

  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map((item) => {
        if (item.isCamera) {
          return (
            <a key={item.href} href={item.href} className="flex flex-col items-center">
              <div className="camera-btn text-white text-xl">
                {item.icon}
              </div>
            </a>
          )
        }

        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')

        return (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 px-2 ${
              isActive ? 'text-amber-600' : 'text-gray-400'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="text-xs">{item.label}</span>
          </a>
        )
      })}
    </nav>
  )
}
