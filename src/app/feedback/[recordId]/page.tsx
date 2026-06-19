'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loading } from '@/components/common'

const FEELING_LABELS: Record<string, string> = {
  much_better: '好很多', better: '好一点', no_change: '没有变化', worse: '更糟了',
}
const USEFUL_LABELS: Record<string, string> = {
  very_useful: '很有用', useful: '有点用', average: '一般', not_useful: '没用',
}
const FEELING_OPTIONS = [
  { value: 'much_better', label: '好很多', emoji: '😄' },
  { value: 'better', label: '好一点', emoji: '🙂' },
  { value: 'no_change', label: '没有变化', emoji: '😐' },
  { value: 'worse', label: '更糟了', emoji: '😞' },
]
const USEFUL_OPTIONS = [
  { value: 'very_useful', label: '很有用', emoji: '⭐' },
  { value: 'useful', label: '有点用', emoji: '👍' },
  { value: 'average', label: '一般', emoji: '🤷' },
  { value: 'not_useful', label: '没用', emoji: '👎' },
]

interface ExistingFeedback {
  feelingAfterOption: string
  usefulnessOption: string
  anxietyScoreAfter: number | null
  anxietyScoreBefore: number | null
  followupText: string | null
  submittedAt: string
}

export default function FeedbackPage() {
  const router = useRouter()
  const { recordId } = useParams<{ recordId: string }>()
  const [existing, setExisting] = useState<ExistingFeedback | null>(null)
  const [loading, setLoading] = useState(true)
  const [feeling, setFeeling] = useState('')
  const [usefulness, setUsefulness] = useState('')
  const [scoreAfter, setScoreAfter] = useState(0)
  const [followup, setFollowup] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadExisting()
  }, [])

  async function loadExisting() {
    try {
      const res = await fetch(`/api/analysis/${recordId}/feedback`)
      const json = await res.json()
      if (json.success && json.data.feedback) {
        setExisting(json.data.feedback)
      }
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  async function handleSubmit() {
    if (!feeling || !usefulness) { setError('请完成必选项'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch(`/api/analysis/${recordId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feelingAfterOption: feeling,
          usefulnessOption: usefulness,
          anxietyScoreAfter: scoreAfter || undefined,
          followupText: followup || undefined,
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error?.message || '提交失败'); return }
      setSubmitted(true)
    } catch { setError('网络异常') }
    finally { setSubmitting(false) }
  }

  if (loading) return <Loading fullScreen text="加载反馈…" />

  // ===== 已提交（查看模式）=====
  if (existing || submitted) {
    const f = existing
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="max-w-lg mx-auto px-6 pt-6 pb-32 space-y-6">
          <h1 className="text-xl font-bold text-gray-800 text-center">分析反馈</h1>

          <div className="card space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">情绪变化</span>
              <span className="tag">
                {f?.feelingAfterOption ? FEELING_LABELS[f.feelingAfterOption] : ''}
              </span>
            </div>

            <div className="border-t border-gray-100" />

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">有用程度</span>
              <span className="tag">
                {f?.usefulnessOption ? USEFUL_LABELS[f.usefulnessOption] : ''}
              </span>
            </div>

            {(f?.anxietyScoreBefore != null || f?.anxietyScoreAfter != null) && (
              <>
                <div className="border-t border-gray-100" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">焦虑值变化</span>
                  <span className="text-sm font-medium text-gray-700">
                    {f.anxietyScoreBefore != null ? `${f.anxietyScoreBefore} → ` : ''}
                    {f.anxietyScoreAfter != null ? f.anxietyScoreAfter : ''}
                  </span>
                </div>
              </>
            )}

            {f?.followupText && (
              <>
                <div className="border-t border-gray-100" />
                <div>
                  <p className="text-sm text-gray-500 mb-2">后续感受</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-xl p-3 leading-relaxed">{f.followupText}</p>
                </div>
              </>
            )}

            <div className="border-t border-gray-100 pt-3">
              <p className="text-xs text-gray-400">
                提交时间：{f?.submittedAt ? new Date(f.submittedAt).toLocaleString('zh-CN') : ''}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button onClick={() => router.back()} className="btn-secondary w-full">← 返回分析</button>
            <button onClick={() => router.push('/home')} className="btn-primary w-full">回首页</button>
          </div>
        </div>
      </div>
    )
  }

  // ===== 未提交（提交模式）=====
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 pt-6 pb-32 space-y-6">
        <h1 className="text-xl font-bold text-gray-800 text-center">分析反馈</h1>
        <p className="text-gray-400 text-sm text-center">帮助我们知道这次分析是否有用（非必填）</p>

        {/* 有没有好一点 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">现在有没有好一点？</h3>
          <div className="grid grid-cols-2 gap-2">
            {FEELING_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => { setFeeling(opt.value); setError('') }}
                className={`py-3 rounded-xl text-sm font-medium transition border ${
                  feeling === opt.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}>
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 有没有用 */}
        <div className="card space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">这次分析有没有用？</h3>
          <div className="grid grid-cols-2 gap-2">
            {USEFUL_OPTIONS.map(opt => (
              <button key={opt.value}
                onClick={() => { setUsefulness(opt.value); setError('') }}
                className={`py-3 rounded-xl text-sm font-medium transition border ${
                  usefulness === opt.value
                    ? 'border-amber-400 bg-amber-50 text-amber-700'
                    : 'border-gray-200 bg-white text-gray-500'
                }`}>
                {opt.emoji} {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 分析后焦虑强度 */}
        <div className="card space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-gray-500">分析后焦虑强度（可选）</span>
            <span className="text-sm font-bold text-gray-500">{scoreAfter}/10</span>
          </div>
          <input type="range" min={0} max={10} step={1} value={scoreAfter}
            onChange={e => setScoreAfter(Number(e.target.value))}
            className="w-full accent-amber-600" />
        </div>

        {/* 后续感受 */}
        <div className="space-y-2">
          <span className="text-sm text-gray-500">后续感受（可选，最多 500 字）</span>
          <textarea value={followup} onChange={e => setFollowup(e.target.value)}
            className="input-base text-sm resize-none" rows={4} maxLength={500}
            placeholder="看完分析还有什么想说的？" />
        </div>

        {/* 跳过 */}
        <button onClick={() => router.back()}
          className="w-full text-center text-amber-600 text-sm py-2">
          跳过反馈
        </button>
      </div>

      {/* 底部提交 */}
      <div className="bottom-fixed">
        {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
        <button onClick={handleSubmit} disabled={submitting}
          className="btn-primary w-full text-center disabled:opacity-50">
          {submitting ? '提交中…' : '提交反馈'}
        </button>
      </div>
    </div>
  )
}
