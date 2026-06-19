'use client'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loading, ErrorState } from '@/components/common'

interface KnowledgeDetail {
  id: string
  title: string
  categoryName: string
  body: string
  applicableScene: string
  sourceNote: string
  isHomeRecommended: boolean
  tags: string[]
  related: { id: string; title: string; summary: string }[]
}

export default function KnowledgeDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()
  const [data, setData] = useState<KnowledgeDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!id) return
    fetch(`/api/knowledge/${id}`)
      .then(r => r.json())
      .then(json => {
        if (!json.success) { setError(json.error?.message || '加载失败'); return }
        setData(json.data)
      })
      .catch(() => setError('网络异常'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <Loading fullScreen text="加载知识内容…" />
  if (error) return <ErrorState title="加载失败" message={error} onGoHome={() => router.push('/knowledge')} />
  if (!data) return null

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 pt-6 pb-24 space-y-5">
        {/* 返回 */}
        <button onClick={() => router.back()} className="text-amber-600 text-sm">← 返回</button>

        {/* 标题 */}
        <div>
          <span className="text-xs text-gray-400">{data.categoryName}</span>
          <h1 className="text-xl font-bold text-gray-800">{data.title}</h1>
        </div>

        {/* 标签 */}
        {data.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {data.tags.map(tag => (
              <span key={tag} className="px-2.5 py-1 bg-amber-50 text-amber-600 text-xs rounded-full">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* 适用场景 */}
        {data.applicableScene && (
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-blue-500 font-medium mb-1">🎯 适用场景</p>
            <p className="text-sm text-blue-700">{data.applicableScene}</p>
          </div>
        )}

        {/* 正文 */}
        <div className="card">
          <div className="text-sm text-gray-600 leading-relaxed space-y-2">
            {renderMarkdown(data.body)}
          </div>
        </div>

        {/* 来源 */}
        {data.sourceNote && (
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-400 font-medium mb-1">📖 参考来源</p>
            <p className="text-xs text-gray-500">{data.sourceNote}</p>
          </div>
        )}

        {/* 相关推荐 */}
        {data.related.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-600 mb-3">📚 相关推荐</h3>
            <div className="space-y-2">
              {data.related.map(r => (
                <button
                  key={r.id}
                  onClick={() => { setLoading(true); setData(null); router.push(`/knowledge/${r.id}`) }}
                  className="card w-full text-left hover:shadow-md transition-shadow"
                >
                  <p className="text-sm font-medium text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{r.summary}</p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function renderMarkdown(text: string) {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    if (!line.trim()) {
      elements.push(<div key={`md${i}`} className="h-2" />)
      i++
      continue
    }

    const h2Match = line.match(/^## (.+)/)
    if (h2Match) {
      elements.push(
        <h4 key={`md${i}`} className="text-base font-semibold text-gray-700 mt-3 mb-1">
          {renderBold(`md${i}`, h2Match[1])}
        </h4>
      )
      i++
      continue
    }

    if (line.trim().startsWith('- ')) {
      elements.push(
        <div key={`md${i}`} className="flex gap-2 text-sm">
          <span className="text-amber-400 shrink-0 mt-0.5">•</span>
          <span className="text-gray-600">{renderBold(`md${i}`, line.replace(/^-\s*/, ''))}</span>
        </div>
      )
      i++
      continue
    }

    elements.push(
      <p key={`md${i}`} className="text-sm text-gray-600">{renderBold(`md${i}`, line)}</p>
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
