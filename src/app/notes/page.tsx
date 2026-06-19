'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'
import { Loading, EmptyState, ErrorState } from '@/components/common'

interface NoteSource { type: string; title: string; status: string }
interface NoteItem {
  id: string; title: string; summary: string; tags: string[]; sources: NoteSource[]; updatedAt: string
}
interface Pagination { page: number; total: number; hasMore: boolean }

export default function NotesPage() {
  const router = useRouter()
  const [notes, setNotes] = useState<NoteItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const searchRef = useRef('')
  const composingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => { fetchNotes(1, '') }, [])

  async function fetchNotes(page: number, term: string) {
    const p = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (term) p.set('search', term)
    try {
      const res = await fetch(`/api/notes?${p}`)
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '加载失败'); return }
      if (page === 1) setNotes(json.data.notes)
      else setNotes(prev => [...prev, ...json.data.notes])
      setPagination(json.data.pagination)
    } catch { if (page === 1) setError('网络异常') }
    finally { setLoading(false); setLoadingMore(false) }
  }

  function triggerSearch(term: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => { setLoading(true); setNotes([]); fetchNotes(1, term) }, 400)
  }

  function onSearchInput(v: string) {
    setSearch(v); searchRef.current = v
    if (!composingRef.current) triggerSearch(v)
  }

  function loadMore() {
    if (!pagination?.hasMore || loadingMore) return
    setLoadingMore(true)
    fetchNotes(pagination.page + 1, searchRef.current)
  }

  if (loading) return <MobileLayout><div className="px-6 pt-6 pb-24"><h1 className="text-xl font-bold text-gray-800 mb-4">个人笔记</h1><Loading text="加载笔记…" /></div></MobileLayout>
  if (error) return <MobileLayout><div className="px-6 pt-6 pb-24"><h1 className="text-xl font-bold text-gray-800 mb-4">个人笔记</h1><ErrorState title="加载失败" message={error} onRetry={() => { setLoading(true); setError(''); fetchNotes(1, searchRef.current) }} /></div></MobileLayout>

  return (
    <MobileLayout>
      <div className="px-6 pt-6 pb-24">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-800">个人笔记</h1>
          <button onClick={() => router.push('/notes/new')} className="btn-primary text-sm px-4 py-2">+ 写笔记</button>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <button onClick={() => router.back()} className="text-amber-600 text-sm shrink-0">← 返回</button>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 gap-3">
            <span className="text-gray-300">🔍</span>
            <input type="text" value={search}
              onChange={e => onSearchInput(e.target.value)}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={e => { composingRef.current = false; const v = (e.target as HTMLInputElement).value; setSearch(v); searchRef.current = v; triggerSearch(v) }}
              placeholder="搜索笔记…" className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-300" />
            {search && <button onClick={() => { setSearch(''); searchRef.current = ''; setLoading(true); fetchNotes(1, '') }}
              className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white text-xs shrink-0">✕</button>}
          </div>
        </div>

        {notes.length === 0 && (
          <EmptyState icon="📝" title={search ? '没有匹配的笔记' : '还没有笔记'}
            description={search ? '试试其他关键词' : '记录你的想法、反思和发现'}
            actionLabel="写第一篇笔记" onAction={() => router.push('/notes/new')} />
        )}

        <div className="space-y-3">
          {notes.map(n => (
            <button key={n.id} onClick={() => router.push(`/notes/${n.id}`)}
              className="card w-full text-left hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between gap-2 mb-1">
                <h3 className="text-sm font-semibold text-gray-800 leading-snug flex-1 line-clamp-1">{n.title}</h3>
                <span className="text-xs text-gray-300 shrink-0 mt-0.5">{formatDate(n.updatedAt)}</span>
              </div>
              <p className="text-xs text-gray-400 line-clamp-2 mb-2">{n.summary}</p>
              <div className="flex items-center gap-2 flex-wrap">
                {n.tags.map(t => <span key={t} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">{t}</span>)}
                {n.sources.length > 0 && n.sources[0].title && (
                  <span className="text-xs text-gray-300">🔗 {n.sources[0].status === 'deleted' ? '来源已删除' : n.sources[0].title.slice(0, 15)}</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {pagination?.hasMore && (
          <div className="mt-6 text-center">
            <button onClick={loadMore} disabled={loadingMore} className="btn-secondary text-sm px-8 disabled:opacity-50">
              {loadingMore ? '加载中…' : `加载更多（${pagination.total - notes.length} 条）`}
            </button>
          </div>
        )}
        {pagination && !pagination.hasMore && notes.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-6">— 已展示全部笔记 —</p>
        )}
      </div>
    </MobileLayout>
  )
}

function formatDate(iso: string) {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const m = Math.floor(diff / 60000)
  const h = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (m < 1) return '刚刚'
  if (m < 60) return `${m}分钟前`
  if (h < 24) return `${h}小时前`
  if (days < 7) return `${days}天前`
  return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
}
