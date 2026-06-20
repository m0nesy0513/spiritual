import { Suspense } from 'react'
import { MobileLayout } from '@/components/layout'
import { ComingSoonContent } from './ComingSoonContent'

export default function ComingSoonPage() {
  return (
    <MobileLayout>
      <Suspense
        fallback={
          <div className="min-h-[80vh] flex items-center justify-center">
            <div className="animate-pulse text-gray-400 text-sm">加载中…</div>
          </div>
        }
      >
        <ComingSoonContent />
      </Suspense>
    </MobileLayout>
  )
}
