'use client'

import { useState, useEffect } from 'react'
import { MobileLayout } from '@/components/layout'
import { Skeleton } from '@/components/common'

interface HomeData {
  greeting: { text: string }
  quote: { text: string; author: string; placeholder: boolean }
  song: { title: string; artist: string; reason: string; suitableMood: string; placeholder: boolean }
  userState: { isLoggedIn: boolean; hasHistory: boolean }
}

export default function HomePage() {
  const [data, setData] = useState<HomeData | null>(null)
  const [loading, setLoading] = useState(true)

  // 新手教程相关
  const [showTutorial, setShowTutorial] = useState(false)
  const [tutorialChecked, setTutorialChecked] = useState(false)

  useEffect(() => {
    fetchHome()
    checkTutorial()
  }, [])

  async function fetchHome() {
    try {
      const res = await fetch('/api/home')
      const json = await res.json()
      if (json.success) setData(json.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function checkTutorial() {
    if (tutorialChecked) return
    try {
      const res = await fetch('/api/user/preferences')
      const json = await res.json()
      if (json.success && json.data.tutorialCompleted === false) {
        setShowTutorial(true)
      }
    } catch { /* ignore */ }
    finally { setTutorialChecked(true) }
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="px-6 pt-8 pb-24 space-y-6">
          <div className="text-center">
            <Skeleton className="h-8 w-48 mx-auto mb-2" />
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          <Skeleton className="h-12 w-full rounded-xl" />
          <div className="card space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-3/4" /></div>
          <div className="card space-y-2"><Skeleton className="h-4 w-20" /><Skeleton className="h-6 w-2/3" /></div>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="px-6 pt-8 pb-24 space-y-6">
        {/* 问候 */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl font-bold text-amber-700">{data?.greeting.text}</h1>
          <p className="text-gray-400 text-sm mt-1">注意到你的感受，就已经是第一步了</p>
        </div>

        {/* 搜索框（占位，Phase 14 实现） */}
        <div className="relative">
          <input
            type="text"
            placeholder="搜索历史、百宝箱、笔记..."
            className="input-base pl-10 pr-4 py-3 text-sm"
            readOnly
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 text-lg">🔍</span>
        </div>

        {/* 名言卡片 */}
        <div className="card animate-fade-in-up">
          <p className="text-sm text-gray-400 mb-2">💡 今日名言</p>
          {data?.quote.placeholder ? (
            <p className="text-gray-400">{data.quote.text}</p>
          ) : (
            <>
              <p className="text-lg text-gray-700 font-medium leading-relaxed">{data?.quote.text}</p>
              <p className="text-xs text-gray-400 mt-1">— {data?.quote.author}</p>
            </>
          )}
        </div>

        {/* 好歌推荐 */}
        <div className="card animate-fade-in-up">
          <p className="text-sm text-gray-400 mb-2">🎵 好歌推荐</p>
          {data?.song.placeholder ? (
            <p className="text-gray-400">{data.song.reason}</p>
          ) : (
            <>
              <p className="text-base font-semibold text-gray-700">{data?.song.title}</p>
              <p className="text-sm text-gray-500">{data?.song.artist}</p>
              <p className="text-xs text-gray-400 mt-1">{data?.song.reason} · {data?.song.suitableMood}</p>
            </>
          )}
        </div>
      </div>

      {/* 新手教程遮罩 */}
      {showTutorial && (
        <TutorialOverlay onComplete={() => setShowTutorial(false)} />
      )}
    </MobileLayout>
  )
}

// ====== Tutorial Overlay (内联，后续移到独立组件) ======

interface TutorialOverlayProps {
  onComplete: () => void
}

const TUTORIAL_STEPS = [
  {
    title: '欢迎来到精神避难所',
    desc: '这里是首页，每天陪伴你度过社交媒体带来的焦虑时刻',
  },
  {
    title: '统一搜索',
    desc: '在这里可以搜索你的历史记录、百宝箱内容和笔记',
  },
  {
    title: '底部导航',
    desc: '切换首页、功能入口、上传截图、百宝箱和我的页面',
  },
  {
    title: '中间相机按钮',
    desc: '这是最重要的入口！点击上传社交媒体截图，开始分析',
  },
  {
    title: '功能入口',
    desc: '这里可以找到个人笔记、用户反馈和更多功能',
  },
  {
    title: '百宝箱',
    desc: '浏览焦虑知识库，学习和成长',
  },
  {
    title: '我的页面',
    desc: '查看历史记录、个人笔记、修改设置。也可在这里重新查看本教程',
  },
]

function TutorialOverlay({ onComplete }: TutorialOverlayProps) {
  const [step, setStep] = useState(0)

  async function complete() {
    try {
      await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorialCompleted: true }),
      })
    } catch { /* 非关键 */ }
    onComplete()
  }

  const current = TUTORIAL_STEPS[step]
  const isLast = step === TUTORIAL_STEPS.length - 1
  const isFirst = step === 0

  return (
    <div className="fullscreen-overlay z-50">
      <div className="bg-white rounded-2xl mx-4 p-6 max-w-sm w-full text-center animate-fade-in-up">
        {/* 步骤指示器 */}
        <div className="flex justify-center gap-1.5 mb-4">
          {TUTORIAL_STEPS.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition ${
                i === step ? 'bg-amber-500 w-4' : 'bg-gray-200'
              }`}
            />
          ))}
        </div>

        <div className="text-4xl mb-3">
          {step === 0 ? '👋' : step === 1 ? '🔍' : step === 2 ? '🧭' : step === 3 ? '📷' : step === 4 ? '🧩' : step === 5 ? '📚' : '👤'}
        </div>
        <h3 className="text-lg font-semibold text-gray-800 mb-2">{current.title}</h3>
        <p className="text-sm text-gray-500 mb-6">{current.desc}</p>

        <div className="flex gap-3">
          {isFirst ? (
            <button onClick={complete} className="flex-1 btn-secondary text-sm">
              跳过
            </button>
          ) : (
            <button onClick={() => setStep(s => s - 1)} className="flex-1 btn-secondary text-sm">
              上一步
            </button>
          )}
          {isLast ? (
            <button onClick={complete} className="flex-1 btn-primary text-sm">
              完成
            </button>
          ) : (
            <button onClick={() => setStep(s => s + 1)} className="flex-1 btn-primary text-sm">
              下一步
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
