'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function OnboardingPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleComplete() {
    setLoading(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ onboardingCompleted: true }),
      })
    } catch { /* 非关键 */ }
    router.push('/home')
  }

  function handleSkip() {
    handleComplete()
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full animate-fade-in-up">
        <h1 className="text-3xl font-bold text-amber-700 text-center mb-4">
          欢迎来到精神避难所
        </h1>

        <p className="text-center text-gray-500 text-lg mb-8">
          一个面向社交媒体焦虑的网站工具<br />
          帮助你从焦虑、不安、自我否定中抽离出来
        </p>

        <div className="card space-y-4 mb-6">
          <h2 className="text-base font-semibold text-gray-700">🧠 产品说明</h2>
          <p className="text-sm text-gray-500 leading-relaxed">
            上传朋友圈、小红书等社交媒体截图，AI 帮你拆解其中的人设包装、
            隐藏信息和比较陷阱，结合心理学方法帮你理解自己的情绪来源，
            获得具体可行的建议。
          </p>

          <div className="border-t border-gray-100 pt-4">
            <h2 className="text-base font-semibold text-gray-700">⚠️ 免责声明摘要</h2>
            <p className="text-sm text-gray-500 leading-relaxed">
              本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。
              如果你正在经历强烈痛苦或危险想法，请寻求专业帮助。
            </p>
          </div>
        </div>

        <div className="space-y-3">
          <button onClick={handleComplete} disabled={loading} className="btn-primary w-full">
            {loading ? '加载中…' : '继续'}
          </button>
          <button onClick={handleSkip} className="btn-secondary w-full text-sm">
            跳过
          </button>
        </div>

        <div className="flex justify-center gap-4 mt-4 text-sm">
          <a href="/terms" className="text-amber-600">查看完整产品说明</a>
          <a href="/disclaimer" className="text-amber-600">查看完整免责声明</a>
        </div>
      </div>
    </div>
  )
}
