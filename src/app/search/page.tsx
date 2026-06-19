'use client'

import { useState, useEffect, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MobileLayout } from '@/components/layout'
import { Loading, EmptyState } from '@/components/common'

interface HistoryResult {
  id: string; title: string; date: string; sourceType: string
}
interface KnowledgeResult {
  id: string; title: string; category: string; summary: string; isRecommended: boolean; sourceType: string
}
interface NotesResult {
  id: string; title: string; summary: string; date: string; sourceType: string
}
interface SearchData {
  history: HistoryResult[]
  knowledge: KnowledgeResult[]
  notes: NotesResult[]
  term: string
}

const TAB_LABELS = [
  { key: 'all', label: '全部' },
  { key: 'history', label: '历史' },
  { key: 'knowledge', label: '百宝箱' },
  { key: 'notes', label: '笔记' },
] as const

export default function SearchPageWrapper() {
  return (
    <Suspense fallback={<MobileLayout><div className="px-6 pt-6 pb-24"><Loading text="加载搜索…" /></div></MobileLayout>}>
      <SearchPage />
    </Suspense>
  )
}

function SearchPage() {
  const router = useRouter()
  const sp = useSearchParams()
  const initialQuery = sp.get('q') || ''

  const [results, setResults] = useState<SearchData | null>(null)
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [tab, setTab] = useState<string>('all')
  const [query, setQuery] = useState(initialQuery)
  const composingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    if (initialQuery) doSearch(initialQuery)
  }, [initialQuery])

  function triggerSearch(term: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => doSearch(term), 300)
  }

  async function doSearch(term: string) {
    if (!term.trim()) return
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`)
      const json = await res.json()
      if (json.success) setResults(json.data)
      setSearched(true)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  function onInput(v: string) {
    setQuery(v)
    if (!composingRef.current) triggerSearch(v)
  }

  function getItemCount(type: string) {
    if (!results) return 0
    if (type === 'history') return results.history.length
    if (type === 'knowledge') return results.knowledge.length
    if (type === 'notes') return results.notes.length
    return results.history.length + results.knowledge.length + results.notes.length
  }

  function navigate(item: { id: string; sourceType: string }) {
    const map: Record<string, string> = {
      history: `/analysis/`,
      knowledge: `/knowledge/`,
      notes: `/notes/`,
    }
    router.push(map[item.sourceType] + item.id)
  }

  const allItems = results
    ? [
        ...results.history.map((h: any) => ({ ...h, _sort: 0 })),
        ...results.knowledge.map((k: any) => ({ ...k, _sort: 1 })),
        ...results.notes.map((n: any) => ({ ...n, _sort: 2 })),
      ]
    : []

  return (
    <MobileLayout>
      <div className="pt-3 pb-24">
        {/* 搜索栏 — 简约风 */}
        <div className="flex items-center gap-3 mb-5">
          <div className="flex-1 flex items-center bg-gray-50 rounded-xl px-4 py-3 gap-3">
            <span className="text-gray-300">🔍</span>
            <input
              type="text"
              value={query}
              onChange={e => onInput(e.target.value)}
              onCompositionStart={() => { composingRef.current = true }}
              onCompositionEnd={e => {
                composingRef.current = false
                const v = (e.target as HTMLInputElement).value
                setQuery(v)
                triggerSearch(v)
              }}
              placeholder="搜索…"
              className="flex-1 text-sm text-gray-700 bg-transparent outline-none placeholder:text-gray-300"
              autoFocus
            />
            {query && (
              <button onClick={() => { setQuery(''); setResults(null); setSearched(false) }}
                className="w-5 h-5 flex items-center justify-center rounded-full bg-gray-300 text-white text-xs shrink-0">✕</button>
            )}
          </div>
          <button onClick={() => router.back()} className="text-gray-500 text-sm shrink-0">取消</button>
        </div>

        <div className="px-6">

        {/* Tab 栏 */}
        {searched && (
          <div className="flex gap-2 mb-4 overflow-x-auto hide-scrollbar">
            {TAB_LABELS.map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-sm font-medium transition ${
                  tab === t.key ? 'bg-amber-500 text-white' : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                {t.label}
                <span className="ml-1 opacity-70">{getItemCount(t.key)}</span>
              </button>
            ))}
          </div>
        )}

        {/* 加载中 */}
        {loading && <Loading text="搜索中…" />}

        {/* 空结果 */}
        {searched && !loading && getItemCount(tab === 'all' ? 'all' : tab) === 0 && (
          <EmptyState icon="🔍" title="没有找到相关内容"
            description={`"${results?.term || query}" 无匹配结果，试试其他关键词`} />
        )}

        {/* 结果列表 */}
        {!loading && (
          <div className="space-y-2">
            {/* 全部模式 */}
            {tab === 'all' && allItems.map((item: any, i: number) => (
              <ResultCard key={`${item.sourceType}-${item.id}`} item={item} onClick={() => navigate(item)} />
            ))}

            {/* 历史 */}
            {tab === 'history' && results?.history.map((h: HistoryResult) => (
              <ResultCard key={h.id} item={{ ...h, _sort: 0 }} onClick={() => navigate(h)} />
            ))}

            {/* 百宝箱 */}
            {tab === 'knowledge' && results?.knowledge.map((k: KnowledgeResult) => (
              <ResultCard key={k.id} item={{ ...k, _sort: 1 }} onClick={() => navigate(k)} />
            ))}

            {/* 笔记 */}
            {tab === 'notes' && results?.notes.map((n: NotesResult) => (
              <ResultCard key={n.id} item={{ ...n, _sort: 2 }} onClick={() => navigate(n)} />
            ))}
          </div>
        )}
        </div>
      </div>
    </MobileLayout>
  )
}

function ResultCard({ item, onClick }: { item: any; onClick: () => void }) {
  const typeLabel: Record<string, string> = { history: '历史', knowledge: '百宝箱', notes: '笔记' }
  const typeColor: Record<string, string> = { history: 'text-blue-500 bg-blue-50', knowledge: 'text-amber-600 bg-amber-50', notes: 'text-green-600 bg-green-50' }

  return (
    <button onClick={onClick} className="card w-full text-left hover:shadow-md transition-shadow">
      <div className="flex items-start gap-2">
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full ${typeColor[item.sourceType] || ''}`}>
          {typeLabel[item.sourceType]}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-800 line-clamp-1">{item.title}</p>
          {(item.summary || item.category) && (
            <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{item.summary || item.category}</p>
          )}
          {item.date && (
            <p className="text-xs text-gray-300 mt-0.5">{new Date(item.date).toLocaleDateString('zh-CN')}</p>
          )}
        </div>
        <span className="text-gray-300 text-xs shrink-0">→</span>
      </div>
    </button>
  )
}
