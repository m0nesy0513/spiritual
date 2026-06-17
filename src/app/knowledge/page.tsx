'use client'

import { useState, useEffect, useRef } from 'react'
import { MobileLayout } from '@/components/layout'
import { Loading, EmptyState, ErrorState } from '@/components/common'

interface Category {
  id: number
  name: string
  itemCount: number
}

interface KnowledgeItem {
  id: string
  title: string
  categoryId: number
  categoryName: string
  body: string
  applicableScene: string
  sourceNote: string
  isHomeRecommended: boolean
  tags: string[]
  summary: string
}

interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
  hasMore: boolean
}

export default function KnowledgePage() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const scrollPosRef = useRef(0)
  const [categories, setCategories] = useState<Category[]>([])
  const [items, setItems] = useState<KnowledgeItem[]>([])
  const [pagination, setPagination] = useState<Pagination | null>(null)
  const [loading, setLoading] = useState(true)
  const [canScroll, setCanScroll] = useState({ left: false, right: true })

  function checkScroll(el: HTMLElement) {
    setCanScroll({ left: el.scrollLeft > 2, right: el.scrollLeft < el.scrollWidth - el.clientWidth - 2 })
  }

  function scrollBy(delta: number) {
    scrollRef.current?.scrollBy({ left: delta, behavior: 'smooth' })
  }
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState<number>(0) // 0 = all
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const searchRef = useRef('')
  const composingRef = useRef(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>()

  useEffect(() => {
    fetchKnowledge(1, 0, '')
  }, [])

  // 数据加载完成后恢复滚动位置 + 检查箭头
  useEffect(() => {
    if (!loading && items.length > 0) {
      requestAnimationFrame(() => {
        const el = scrollRef.current
        if (!el) return
        el.scrollLeft = scrollPosRef.current
        checkScroll(el)
      })
    }
  }, [loading, items])

  async function fetchKnowledge(page: number, categoryId: number, searchTerm: string) {
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (categoryId > 0) params.set('categoryId', String(categoryId))
    if (searchTerm) params.set('search', searchTerm)

    try {
      const res = await fetch(`/api/knowledge?${params}`)
      const json = await res.json()
      if (!json.success) { setError(json.error?.message || '加载失败'); return }

      const data = json.data
      if (page === 1) {
        setCategories(data.categories)
        setItems(data.items)
      } else {
        setItems(prev => [...prev, ...data.items])
      }
      setPagination(data.pagination)
    } catch {
      if (page === 1) setError('网络异常')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  function switchCategory(categoryId: number) {
    scrollPosRef.current = scrollRef.current?.scrollLeft || 0
    setActiveCategory(categoryId)
    setExpandedId(null)
    setLoading(true)
    setItems([])
    setCanScroll({ left: false, right: false })
    fetchKnowledge(1, categoryId, searchRef.current)
  }

  function triggerSearch(term: string) {
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      setLoading(true)
      setItems([])
      fetchKnowledge(1, activeCategory, term)
    }, 400)
  }

  function onSearchInput(value: string) {
    setSearch(value)
    searchRef.current = value
    if (!composingRef.current) triggerSearch(value)
  }

  function loadMore() {
    if (!pagination?.hasMore || loadingMore) return
    setLoadingMore(true)
    fetchKnowledge(pagination.page + 1, activeCategory, searchRef.current)
  }

  if (loading) {
    return (
      <MobileLayout>
        <div className="px-6 pt-6 pb-24">
          <h1 className="text-xl font-bold text-gray-800 mb-4">百宝箱</h1>
          <Loading text="加载知识库…" />
        </div>
      </MobileLayout>
    )
  }

  if (error) {
    return (
      <MobileLayout>
        <div className="px-6 pt-6 pb-24">
          <h1 className="text-xl font-bold text-gray-800 mb-4">百宝箱</h1>
          <ErrorState title="加载失败" message={error} onRetry={() => { setLoading(true); setError(''); fetchKnowledge(1, activeCategory, searchRef.current); }} />
        </div>
      </MobileLayout>
    )
  }

  return (
    <MobileLayout>
      <div className="px-6 pt-6 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-4">百宝箱</h1>

        {/* 搜索 */}
        <div className="relative mb-4">
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
            placeholder="搜索知识条目..."
            className="input-base pl-10 pr-4 py-2.5 text-sm"
          />
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300">🔍</span>
          {search && (
            <button
              onClick={() => { setSearch(''); searchRef.current = ''; setLoading(true); fetchKnowledge(1, activeCategory, ''); }}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm"
            >✕</button>
          )}
        </div>

        {/* 分类横向滚动 */}
        <div className="flex items-center gap-1 mb-5">
          {canScroll.left && (
            <button onClick={() => scrollBy(-200)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-amber-600 text-xs">
              ◀
            </button>
          )}
          <div
            ref={scrollRef}
            className="flex-1 overflow-x-auto hide-scrollbar"
            onScroll={e => checkScroll(e.currentTarget)}
          >
            <div className="flex gap-2 w-max">
              <button
                onClick={() => switchCategory(0)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                  activeCategory === 0
                    ? 'bg-amber-500 text-white'
                    : 'bg-white text-gray-500 border border-gray-200'
                }`}
              >
                全部
                {pagination && <span className="ml-1 opacity-70">{pagination.total}</span>}
              </button>
              {categories.map(cat => (
                <button
                  key={cat.id}
                  onClick={() => switchCategory(cat.id)}
                  className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition ${
                    activeCategory === cat.id
                      ? 'bg-amber-500 text-white'
                      : 'bg-white text-gray-500 border border-gray-200'
                  }`}
                >
                  {cat.name}
                  <span className="ml-1 opacity-70">{cat.itemCount}</span>
                </button>
              ))}
            </div>
          </div>
          {canScroll.right && (
            <button onClick={() => scrollBy(200)} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-full bg-white border border-gray-200 text-gray-400 hover:text-amber-600 text-xs">
              ▶
            </button>
          )}
        </div>

        {/* 空状态 */}
        {items.length === 0 && (
          <EmptyState
            icon="📚"
            title={search ? '没有匹配的内容' : '暂无内容'}
            description={search ? '试试其他关键词' : '知识库正在建设中'}
          />
        )}

        {/* 知识条目列表 */}
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="card">
              {/* 标题行 */}
              <button
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="w-full text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-semibold text-gray-800 leading-snug">{item.title}</h3>
                    <p className="text-xs text-gray-400 mt-1">{item.summary}</p>
                    <span className="inline-block mt-1.5 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded-full">{item.categoryName}</span>
                  </div>
                  <span className="text-gray-300 text-xs mt-1 shrink-0">
                    {expandedId === item.id ? '▲' : '▼'}
                  </span>
                </div>

                {/* 标签 */}
                {item.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {item.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 bg-amber-50 text-amber-600 text-xs rounded-full">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </button>

              {/* 展开内容 */}
              {expandedId === item.id && (
                <div className="mt-4 pt-4 border-t border-gray-100 space-y-3 animate-fade-in-up">
                  {/* 适用场景 */}
                  {item.applicableScene && (
                    <div className="bg-blue-50 rounded-xl p-3">
                      <p className="text-xs text-blue-500 font-medium mb-1">🎯 适用场景</p>
                      <p className="text-sm text-blue-700">{item.applicableScene}</p>
                    </div>
                  )}

                  {/* 正文 Markdown 渲染 */}
                  <div className="text-sm text-gray-600 leading-relaxed">
                    {renderMarkdown(item.body)}
                  </div>

                  {/* 来源 */}
                  {item.sourceNote && (
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-xs text-gray-400 font-medium mb-1">📖 参考来源</p>
                      <p className="text-xs text-gray-500">{item.sourceNote}</p>
                    </div>
                  )}

                  {/* 分类 */}
                  <p className="text-xs text-gray-300">分类：{item.categoryName}</p>
                </div>
              )}
            </div>
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
              {loadingMore ? '加载中…' : `加载更多（${pagination.total - items.length} 条）`}
            </button>
          </div>
        )}

        {pagination && !pagination.hasMore && items.length > 0 && (
          <p className="text-center text-xs text-gray-300 mt-6">— 已展示全部内容 —</p>
        )}
      </div>
    </MobileLayout>
  )
}

/** 简易 Markdown 渲染（支持 ##、**粗体**、- 列表） */
function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      elements.push(<div key={`ml${i}`} className="h-2" />)
      i++
      continue
    }

    const h2Match = line.match(/^## (.+)/)
    if (h2Match) {
      elements.push(
        <h4 key={`ml${i}`} className="text-base font-semibold text-gray-700 mt-3 mb-1">
          {renderBold(`ml${i}`, h2Match[1])}
        </h4>
      )
      i++
      continue
    }

    if (line.trim().startsWith('- ')) {
      elements.push(
        <div key={`ml${i}`} className="flex gap-2 text-sm">
          <span className="text-amber-400 shrink-0 mt-0.5">•</span>
          <span className="text-gray-600">{renderBold(`ml${i}`, line.replace(/^-\s*/, ''))}</span>
        </div>
      )
      i++
      continue
    }

    elements.push(
      <p key={`ml${i}`} className="text-sm text-gray-600">{renderBold(`ml${i}`, line)}</p>
    )
    i++
  }

  return elements
}

function renderBold(prefix: string, text: string): React.ReactNode {
  const parts = text.split(/(\*\*.+?\*\*)/g)
  return parts.map((part, j) => {
    const m = part.match(/^\*\*(.+?)\*\*$/)
    if (m) return <strong key={`${prefix}b${j}`} className="font-semibold text-gray-700">{m[1]}</strong>
    return part
  })
}
