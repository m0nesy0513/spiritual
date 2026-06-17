'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loading, ErrorState, ConfirmModal } from '@/components/common'

interface NoteDetail {
  id: string; title: string; body: string; tags: { id: string; name: string }[]
  sources: { type: string; id: string; title: string; status: string }[]
  createdAt: string; updatedAt: string
}

export default function NoteDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<NoteDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [tags, setTags] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [saveError, setSaveError] = useState('')

  useEffect(() => { if (id) loadNote() }, [id])

  async function loadNote() {
    try {
      const res = await fetch(`/api/notes/${id}`)
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '加载失败'); return }
      setData(json.data)
      setTitle(json.data.title)
      setBody(json.data.body)
      setTags((json.data.tags || []).map((t: any) => t.name).join('，'))
    } catch { setError('网络异常') }
    finally { setLoading(false) }
  }

  async function save() {
    if (!body.trim()) { setSaveError('请输入内容'); return }
    setSaving(true)
    setSaveError('')
    try {
      const tagList = tags.split(/[,，]/).map(t => t.trim()).filter(Boolean)
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim() || body.trim().slice(0, 60), body: body.trim(), tags: tagList }),
      })
      const json = await res.json()
      if (!json.success) { setSaveError(json.error?.message || '保存失败'); return }
      setEditing(false)
      loadNote()
    } catch { setSaveError('网络异常') }
    finally { setSaving(false) }
  }

  async function deleteNote() {
    setDeleting(true)
    try {
      const res = await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) { router.replace('/notes') }
      else { setError(json.error?.message || '删除失败'); setShowDelete(false) }
    } catch { setError('网络异常'); setShowDelete(false) }
    finally { setDeleting(false) }
  }

  function startEdit() { setEditing(true); setSaveError('') }

  if (loading) return <Loading fullScreen text="加载笔记…" />
  if (error) return <ErrorState title="加载失败" message={error} onGoHome={() => router.push('/notes')} />
  if (!data) return null

  // 查看模式
  if (!editing) {
    return (
      <div className="min-h-screen bg-amber-50">
        <div className="max-w-lg mx-auto px-6 pt-4 pb-24">
          <div className="flex items-center justify-between mb-4">
            <button onClick={() => router.back()} className="text-amber-600 text-sm">← 返回</button>
            <div className="flex gap-2">
              <button onClick={startEdit} className="text-amber-600 text-sm">编辑</button>
              <button onClick={() => setShowDelete(true)} className="text-red-400 text-sm">删除</button>
            </div>
          </div>

          <h1 className="text-xl font-bold text-gray-800 mb-1">{data.title}</h1>
          <p className="text-xs text-gray-400 mb-4">更新于 {new Date(data.updatedAt).toLocaleString('zh-CN')}</p>

          {data.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {data.tags.map(t => <span key={t.id} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">{t.name}</span>)}
            </div>
          )}

          {data.sources.length > 0 && data.sources[0].title && (
            <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-500">
              <p className="text-gray-400 mb-1">📎 关联来源</p>
              {data.sources.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span>{s.status === 'deleted' ? '来源已删除' : s.title}</span>
                  {s.status !== 'deleted' && s.id && (
                    <button onClick={() => router.push(s.type === 'history' ? `/analysis/${s.id}` : `/knowledge/${s.id}`)}
                      className="text-amber-600 text-xs">查看 →</button>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="card">
            <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{data.body}</div>
          </div>
        </div>

        <ConfirmModal open={showDelete} title="删除笔记" message="删除后不可恢复，确定删除？"
          onConfirm={deleteNote} onCancel={() => setShowDelete(false)}
          confirmLabel={deleting ? '删除中…' : '删除'} danger />
      </div>
    )
  }

  // 编辑模式
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 pt-4 pb-32">
        <div className="flex items-center justify-between mb-4">
          <button onClick={() => { setEditing(false); loadNote() }} className="text-amber-600 text-sm">← 取消</button>
          <button onClick={save} disabled={saving} className="btn-primary text-sm px-4 py-2 disabled:opacity-50">
            {saving ? '保存中…' : '保存'}
          </button>
        </div>

        <input type="text" value={title} onChange={e => setTitle(e.target.value)}
          placeholder="笔记标题" maxLength={60}
          className="w-full text-lg font-semibold text-gray-800 bg-transparent border-b border-gray-200 pb-2 mb-4 outline-none focus:border-amber-400" />

        <textarea value={body} onChange={e => setBody(e.target.value)}
          className="w-full min-h-48 text-sm text-gray-600 bg-transparent outline-none resize-none leading-relaxed"
          autoFocus />

        <div className="mt-6">
          <p className="text-xs text-gray-400 mb-2">标签（用逗号分隔）</p>
          <input type="text" value={tags} onChange={e => setTags(e.target.value)}
            placeholder="例如：反思、焦虑、成长" maxLength={100}
            className="input-base text-sm" />
        </div>

        {saveError && <p className="text-red-500 text-sm mt-3">{saveError}</p>}
      </div>
    </div>
  )
}
