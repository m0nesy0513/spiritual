'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'
import { Loading, EmptyState, ErrorState } from '@/components/common'

const PLATFORM_LABELS: Record<string, string> = {
  wechat_moments: '微信朋友圈',
  xiaohongshu: '小红书',
  weibo: '微博',
  douyin: '抖音',
  bilibili: 'B站',
  other: '',
}

interface HistoryRecord {
  recordId: string
  createdAt: string
  thumbnailUrl: string | null
  thumbnailPlaceholder: boolean
  sourcePlatform: string
  anxietyScoreBefore: number | null
  primaryPersonaType: string
  primaryAnxietyType: string
  oneSentenceSummary: string
  keywords: string[]
  feedbackSubmitted: boolean
  feedbackSummary: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function HistoryPage() {
  const router = useRouter()
  const [records, setRecords] = useState<HistoryRecord[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const searchRef = useRef('')
  const composingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    fetchHistory(1, '')
  }, [])

  async function fetchHistory(page: number, searchTerm: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (searchTerm) params.set('search', searchTerm)

    try {
      const res = await fetch(`/api/history?${params}`)
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '加载失败'); return }

      const data = json.data
      if (page === 1) {
        setRecords(data.records)
      } else {
        setRecords(prev => [...prev, ...data.records])
      }
      setPagination(data.pagination)
    } catch {
      if (page === 1) setError('网络异常')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function loadMore() {
    if (!pagination?.hasMore || loadingMore) return
    setLoadingMore(true)
    fetchHistory(pagination.page + 1, searchRef.current)
  }

  function triggerSearch(term: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      setRecords([])
      fetchHistory(1, term)
    }, 400)
  }

  function onSearchInput(value: string) {
    setSearch(value)
    searchRef.current = value
    if (!composingRef.current) triggerSearch(value)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`
    return d.toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="px-6 pt-6 pb-24">
          <h1 className="text-xl font-bold text-gray-800 mb-6">历史记录</h1>
          <Loading text="加载记录…" />
        </div>
      </MobileLayout>
    )
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="px-6 pt-6 pb-24">
          <h1 className="text-xl font-bold text-gray-800 mb-6">历史记录</h1>
          <ErrorState title="加载失败" message={error} onRetry={() => { setLoading(true); setError(''); fetchHistory(1, searchRef.current); }} />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="px-6 pt-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-4">历史记录</h1>

        {/* 搜索 — 简约风 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 gap-3">
            <span className="text-gray-300">🔍</span>
            <input
              type="text"
              value={search}
              onChange={e => onSearchInput(e.target.value)}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={e => {
                composingRef.current = false
                const v = (e.target as HTMLInputElement).value
                setSearch(v)
                searchRef.current = v
                triggerSearch(v)
              }}
              placeholder="搜索摘要、关键词…"
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-300"
            />
            {search && (
              <button
                onClick={() => { setSearch(''); searchRef.current = ''; setLoading(true); fetchHistory(1, ''); }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white text-xs shrink-0"
              >✕</button>
            )}
          </div>
        </div>

        {/* 结果数 */}
        {pagination && pagination.total > 0 && (
          <p className="text-xs text-gray-400 mb-3">共 {pagination.total} 条记录</p>
        )}

        {/* 空状态 */}
        {records.length === 0 && !loading && (
          <EmptyState
            icon="📋"
            title={search ? '没有匹配的记录' : '还没有分析记录'}
            description={search ? '试试其他关键词' : '上传一张社交媒体截图，开始你的第一次分析'}
            actionLabel={search ? undefined : '去上传'}
            onAction={search ? undefined : () => router.push('/upload')}
          />
        )}

        {/* 记录列表 */}
        <div className="space-y-3">
          {records.map(rec => (
            <button
              key={rec.recordId}
              onClick={() => router.push(`/analysis/${rec.recordId}`)}
              className="card w-full text-left hover:shadow-md transition-shadow"
            >
              {/* 第一行：摘要 + 日期 */}
              <div className="flex items-start justify-between gap-2 mb-2">
                <p className="text-sm font-medium text-gray-800 leading-snug flex-1 line-clamp-2">
                  {rec.oneSentenceSummary || '分析结果'}
                </p>
                <span className="text-xs text-gray-400 whitespace-nowrap shrink-0 mt-0.5">
                  {formatDate(rec.createdAt)}
                </span>
              </div>

              {/* 第二行：关键词 */}
              {rec.keywords.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-2">
                  {rec.keywords.map((kw, i) => (
                    <span key={i} className="px-2 py-0.5 bg-amber-50 text-amber-700 text-xs rounded-full">
                      {kw}
                    </span>
                  ))}
                </div>
              )}

              {/* 第三行：平台 + 焦虑值 + 反馈状态 */}
              <div className="flex items-center gap-3 text-xs text-gray-400">
                {rec.sourcePlatform && PLATFORM_LABELS[rec.sourcePlatform] && (
                  <span>{PLATFORM_LABELS[rec.sourcePlatform]}</span>
                )}
                {rec.anxietyScoreBefore != null && (
                  <span>焦虑值 {rec.anxietyScoreBefore}/10</span>
                )}
                {rec.primaryPersonaType && (
                  <span className="text-amber-500">{rec.primaryPersonaType}</span>
                )}
                {rec.feedbackSubmitted && (
                  <span className="text-green-500 ml-auto">已反馈</span>
                )}
                {!rec.feedbackSubmitted && (
                  <span className="text-gray-300 ml-auto">未反馈</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* 加载更多 */}
        {pagination?.hasMore && (
          <div className="mt-6 text-center">
            <button
              onClick={loadMore}
              disabled={loadingMore}
              className="btn-secondary text-sm px-8 disabled:opacity-50"
            >
              {loadingMore ? '加载中…' : `加载更多（${pagination.total - records.length} 条）`}
            </button>
          </div>
        )}

        {/* 全部加载完 */}
        {pagination && !pagination.hasMore && records.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-6">— 已展示全部记录 —</p>
        )}
      </div>
    </MobileLayout>
  )
}
