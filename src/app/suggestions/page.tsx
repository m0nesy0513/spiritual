'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'

const TYPES = [
  { value: 'feature_request', label: '功能建议' },
  { value: 'bug_feedback', label: '问题反馈' },
  { value: 'content_correction', label: '内容纠错' },
  { value: 'experience_optimization', label: '体验优化' },
  { value: 'other', label: '其他' },
]

export default function SuggestionsPage() {
  const router = useRouter()
  const [type, setType] = useState('')
  const [content, setContent] = useState('')
  const [contact, setContact] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!content.trim()) { setError('请输入内容'); return }
    if (!type) { setError('请选择类型'); return }
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, content: content.trim(), contact: contact.trim() }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '提交失败'); return }
      setSubmitted(true)
    } catch { setError('网络异常') }
    finally { setSubmitting(false) }
  }

  if (submitted) {
    return (
      <MobileLayout>
        <div className="px-6 pt-8 pb-24 text-center">
          <div className="text-4xl mb-4">✅</div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">提交成功</h1>
          <p className="text-gray-400 text-sm mb-6">谢谢你的反馈，我们会认真考虑</p>
          <button onClick={() => router.push('/home')} className="btn-primary text-sm px-6">回首页</button>
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="px-6 pt-6 pb-32">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold text-gray-800">用户反馈</h1>
          <button onClick={() => router.back()} className="text-amber-600 text-sm">← 返回</button>
        </div>

        <div className="space-y-4">
          {/* 类型选择 */}
          <div className="card">
            <p className="text-sm text-gray-500 mb-3">反馈类型</p>
            <div className="flex flex-wrap gap-2">
              {TYPES.map(t => (
                <button key={t.value} onClick={() => { setType(t.value); setError('') }}
                  className={`px-4 py-2 rounded-full text-sm border transition ${
                    type === t.value ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'
                  }`}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* 内容 */}
          <div className="card">
            <p className="text-sm text-gray-500 mb-2">详细描述</p>
            <textarea value={content} onChange={e => setContent(e.target.value)}
              placeholder="告诉我们你的想法、建议或遇到的问题…"
              className="input-base text-sm resize-none" rows={5} maxLength={1000} />
          </div>

          {/* 联系方式（可选） */}
          <div className="card">
            <p className="text-sm text-gray-500 mb-2">联系方式（可选）</p>
            <input value={contact} onChange={e => setContact(e.target.value)}
              placeholder="手机/邮箱，方便我们回复你"
              className="input-base text-sm" maxLength={100} />
          </div>
        </div>

        <div className="bottom-fixed">
          {error && <p className="text-red-500 text-sm mb-2">{error}</p>}
          <button onClick={submit} disabled={submitting}
            className="btn-primary w-full text-center disabled:opacity-50">
            {submitting ? '提交中…' : '提交反馈'}
          </button>
        </div>
      </div>
    </MobileLayout>
  )
}
