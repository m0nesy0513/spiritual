'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ErrorState } from '@/components/common'

const WAITING_MESSAGES = [
  '正在识别截图内容…',
  '正在理解图像信息…',
  '正在匹配知识库内容…',
  '正在拆解人设与包装…',
  '正在分析比较陷阱…',
  '正在生成建议…',
]

function AnalysisContent() {
  const router = useRouter()
  const params = useSearchParams()
  const [state, setState] = useState<'waiting' | 'cancelling' | 'failed' | 'timeout' | 'redirecting'>('waiting')
  const [msgIdx, setMsgIdx] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [failCount, setFailCount] = useState(0)
  const controllerRef = useRef<AbortController | null>(null)

  const fileId = params.get('fileId')
  const feeling = params.get('feeling') || ''
  const anxiety = params.get('anxiety') || '0'
  const platform = params.get('platform') || ''
  const refHistory = params.get('refHistory') === 'true'
  const manual = params.get('manual') || ''

  // 轮播文案
  useEffect(() => {
    if (state !== 'waiting') return
    const timer = setInterval(() => {
      setMsgIdx(i => (i + 1) % WAITING_MESSAGES.length)
    }, 2500)
    return () => clearInterval(timer)
  }, [state])

  // 触发分析
  useEffect(() => {
    if (!fileId) {
      setErrorMsg('缺少截图文件')
      setState('failed')
      return
    }
    startAnalysis()
  }, [])

  async function startAnalysis() {
    setState('waiting')
    setErrorMsg('')

    const controller = new AbortController()
    controllerRef.current = controller

    // 60 秒超时
    const timeout = setTimeout(() => {
      controller.abort()
      setState('timeout')
      setErrorMsg('分析时间有点久，可能是网络或服务繁忙导致的。')
    }, 60_000)

    try {
      const res = await fetch('/api/analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screenshotFileId: fileId,
          userFeelingText: feeling || undefined,
          manualText: manual || undefined,
          anxietyScoreBefore: anxiety ? Number(anxiety) : undefined,
          sourcePlatform: platform || undefined,
          referenceHistoryEnabled: refHistory,
          saveOriginalScreenshot: false,
          saveFullRecognizedText: false,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      const data = await res.json()
      if (!data.success) {
        setErrorMsg(data.error?.message || '分析失败，请稍后重试')
        setState('failed')
        return
      }

      // 跳转结果页
      setState('redirecting')
      router.replace(`/analysis/${data.data.recordId}`)
    } catch (err: any) {
      clearTimeout(timeout)
      if (err?.name === 'AbortError') {
        setState('timeout')
        setErrorMsg('分析超时，请稍后重试')
      } else {
        setErrorMsg('分析失败，请稍后重试')
        setState('failed')
      }
    }
  }

  function handleRetry() {
    setFailCount(c => c + 1)
    startAnalysis()
  }

  function handleCancel() {
    controllerRef.current?.abort()
    // 保留参数回到上传页
    const backParams = new URLSearchParams()
    if (fileId) backParams.set('fileId', fileId)
    if (feeling) backParams.set('feeling', feeling)
    router.push(`/upload?${backParams.toString()}`)
  }

  if (state === 'waiting') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
        {/* 动画 */}
        <div className="w-20 h-20 mb-8 relative">
          <div className="absolute inset-0 border-4 border-amber-200 rounded-full animate-ping opacity-30" />
          <div className="absolute inset-2 border-4 border-t-amber-500 border-amber-200 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">🔍</div>
        </div>

        <h2 className="text-xl font-semibold text-gray-700 mb-6">正在分析</h2>

        {/* 轮播文案 */}
        <div className="h-8">
          <p className="text-gray-400 text-sm animate-fade-in-up" key={msgIdx}>
            {WAITING_MESSAGES[msgIdx]}
          </p>
        </div>

        <button onClick={handleCancel} className="mt-12 text-gray-400 text-sm underline">
          取消分析
        </button>
      </div>
    )
  }

  if (state === 'timeout' || state === 'failed') {
    return (
      <div className="min-h-screen bg-amber-50 flex flex-col">
        {failCount >= 2 ? (
          <ErrorState
            title="多次分析失败"
            message="可能是服务繁忙，请稍后再试"
            onGoHome={() => router.push('/home')}
          />
        ) : (
          <ErrorState
            title="分析失败"
            message={errorMsg}
            onRetry={handleRetry}
            onGoHome={() => router.push('/home')}
          />
        )}
      </div>
    )
  }

  // redirecting
  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 mx-auto border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin mb-4" />
        <p className="text-gray-400 text-sm">跳转中…</p>
      </div>
    </div>
  )
}

// 用 Suspense 包裹（useSearchParams 需要）
export default function AnalysisPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-amber-50 flex items-center justify-center">
        <div className="w-10 h-10 border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
      </div>
    }>
      <AnalysisContent />
    </Suspense>
  )
}
