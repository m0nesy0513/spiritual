'use client'

import { BottomNav } from './BottomNav'

interface MobileLayoutProps {
  children: React.ReactNode
  /** 是否有底部操作区（给内容区加 padding） */
  hasBottomFixed?: boolean
}

export function MobileLayout({ children, hasBottomFixed = false }: MobileLayoutProps) {
  return (
    <div className="flex flex-col min-h-screen">
      {/* 主内容区 */}
      <main className={`flex-1 ${hasBottomFixed ? 'pb-16' : ''}`}>
        <div className="max-w-lg mx-auto w-full">{children}</div>
      </main>

      {/* 底部导航 */}
      <BottomNav />
    </div>
  )
}
