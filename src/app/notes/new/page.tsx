'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'

export default function NewNotePage() {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function save() {
    if (!body.trim()) { setError('请输入内容'); return }
    setSaving(true)
    setError('')
    try {
      const tagList = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || body.trim().slice(0, 60), body: body.trim(), tags: tagList }),
      })
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '保存失败'); return }
      router.replace(`/notes/${json.data.id}`)
    } catch { setError('网络异常') }
    finally { setSaving(false) }
  }

  return (
    <MobileLayout>
      <div className="px-6 pt-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => router.back()} className="text-amber-600 text-sm">← 返回</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>

        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="笔记标题（可选）" maxLength={60}
          className="w-full text-lg font-semibold text-gray-800 bg-transparent border-b border-gray-200 pb-2 mb-4 outline-none focus:border-amber-400" />

        <textarea value={body} onChange={e => setBody(e.target.value)}
          placeholder="写下你想记录的内容…"
          className="w-full min-h-48 text-sm text-gray-600 bg-transparent outline-none resize-none leading-relaxed"
          autoFocus />

        <div className="mt-6">
          <p className="text-xs text-gray-400 mb-2">标签（用逗号分隔）</p>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="例如：反思、焦虑、成长" maxLength={100}
            className="input-base text-sm" />
        </div>

        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>
    </MobileLayout>
  )
}
