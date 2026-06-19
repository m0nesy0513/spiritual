'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Loading, ErrorState } from '@/components/common'

interface RiskState {
  isHighRisk: boolean
  riskStatus: string
  triggerReasonSummary: string | null
}

interface AnalysisData {
  recordId: string
  createdAt: string
  input: any
  modules: {
    oneSentenceSummary: string
    keywords: string[]
    screenshotSummary: string
    personaTypes: { primary: string; all: string[] }
    anxietyTypes: { primary: string; all: string[] }
    packagingAnalysis: string
    comparisonTrapAnalysis: string
    whyYouFeelAnxious: string
    cbtAssistance: { methodName: string; content: string }
    suggestions: string[]
    knowledgeRecommendations: any[]
    sources: any[]
    disclaimer: { text: string }
  }
  risk: RiskState
  feedback: { submitted: boolean }
  note: { noteText: string }
  customTags: string[]
}

export default function AnalysisResultPage() {
  const router = useRouter()
  const { recordId } = useParams<{ recordId: string }>()
  const [data, setData] = useState<AnalysisData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRisk, setShowRisk] = useState(false)
  const [sourcesExpanded, setSourcesExpanded] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [noteExpanded, setNoteExpanded] = useState(false)

  useEffect(() => {
    if (!recordId) return
    fetchResult()
  }, [recordId])

  async function fetchResult() {
    try {
      const res = await fetch(`/api/analysis/${recordId}`)
      const json = await res.json()
      if (!json.success) {
        setError(json.error?.message || '加载失败')
        if (json.error?.code === 'FORBIDDEN') router.push('/home')
        return
      }
      const d = json.data
      // 清理 AI 返回的 markdown 格式符号
      if (d.modules) {
        const strip = (s: string) => (s || '').replace(/\*\*/g, '')
        for (const key of ['oneSentenceSummary','screenshotSummary','packagingAnalysis','comparisonTrapAnalysis','whyYouFeelAnxious']) {
          if (d.modules[key]) d.modules[key] = strip(d.modules[key])
        }
        if (d.modules.cbtAssistance) {
          d.modules.cbtAssistance.methodName = strip(d.modules.cbtAssistance.methodName || '')
          d.modules.cbtAssistance.content = strip(d.modules.cbtAssistance.content || '')
        }
        if (d.modules.suggestions) d.modules.suggestions = d.modules.suggestions.map(strip)
      }
      if (d.risk?.triggerReasonSummary) d.risk.triggerReasonSummary = (d.risk.triggerReasonSummary || '').replace(/\*\*/g, '')
      if (d.modules?.disclaimer?.text) d.modules.disclaimer.text = d.modules.disclaimer.text.replace(/\*\*/g, '')
      setData(d)
      setNoteText(d.note?.noteText || '')
      if (json.data.risk.isHighRisk && json.data.risk.riskStatus === 'pending') {
        setShowRisk(true)
      }
    } catch {
      setError('加载失败')
    } finally {
      setLoading(false)
    }
  }

  async function handleRisk(action: 'continue_view' | 'return_home') {
    try {
      await fetch(`/api/analysis/${recordId}/risk-state/handle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
    } catch {}
    if (action === 'return_home') router.push('/home')
    else setShowRisk(false)
  }

  async function saveNote() {
    try {
      await fetch(`/api/history/${recordId}/note`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ noteText }),
      })
    } catch {}
  }

  function copyAIOutput() {
    if (!data) return
    const parts = [
      `一句话摘要：${data.modules.oneSentenceSummary}`,
      `关键词：${data.modules.keywords.join('，')}`,
      `截图内容概括：${data.modules.screenshotSummary}`,
      `引起焦虑的人设/人格化形象类型：${data.modules.personaTypes.all.join('，')}`,
      `焦虑自身类型：${data.modules.anxietyTypes.all.join('，')}`,
      `包装与隐藏信息拆解：${data.modules.packagingAnalysis}`,
      `比较陷阱分析：${data.modules.comparisonTrapAnalysis}`,
      `为什么你会焦虑：${data.modules.whyYouFeelAnxious}`,
      `CBT/心理学方法辅助：${data.modules.cbtAssistance.methodName}——${data.modules.cbtAssistance.content}`,
      `具体建议：${data.modules.suggestions.join('\n')}`,
      `来源/参考依据：${data.modules.sources.map(s => s.title).join('，')}`,
    ]
    navigator.clipboard.writeText(parts.join('\n\n'))
  }

  if (loading) return <Loading fullScreen text="加载分析结果…" />
  if (error) return <ErrorState title="加载失败" message={error} onGoHome={() => router.push('/home')} />
  if (!data) return null

  const m = data.modules

  return (
    <div className="min-h-screen bg-amber-50">
      {/* 高风险全屏弹层 */}
      {showRisk && (
        <div className="fullscreen-overlay z-50">
          <div className="bg-white rounded-2xl mx-4 p-6 max-w-md w-full">
            <div className="text-center mb-4 text-4xl">⚠️</div>
            <h2 className="text-xl font-bold text-red-600 text-center mb-2">请注意</h2>
            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
              你在输入中表达了一些可能需要关注的情况。本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。
            </p>
            <div className="bg-red-50 rounded-xl p-3 mb-4 text-sm text-red-700">
              <p className="font-semibold mb-1">如果你正在经历强烈痛苦或危险想法：</p>
              <p>请尽快联系身边可信任的人、医院、专业医生、心理咨询师或当地紧急求助渠道。</p>
            </div>
            <button onClick={() => handleRisk('continue_view')} className="btn-primary w-full mb-3">
              我已了解，继续查看分析
            </button>
            <button onClick={() => handleRisk('return_home')} className="btn-secondary w-full text-sm">
              返回首页
            </button>
          </div>
        </div>
      )}

      <div className="max-w-lg mx-auto px-5 pt-6 pb-40 space-y-5">
        {/* 标题 */}
        <div className="text-center animate-fade-in-up">
          <h1 className="text-2xl font-bold text-amber-700">分析结果</h1>
          <p className="text-xs text-gray-400 mt-1">{new Date(data.createdAt).toLocaleString('zh-CN')}</p>
        </div>

        {/* 1. 一句话摘要 */}
        <ModuleCard emoji="📌" title="一句话摘要">
          <p className="text-lg font-semibold text-amber-700">{m.oneSentenceSummary}</p>
        </ModuleCard>

        {/* 2. 关键词 */}
        <ModuleCard emoji="🏷️" title="关键词">
          {m.keywords.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {m.keywords.map((kw, i) => <span key={i} className="tag">{kw}</span>)}
            </div>
          ) : <p className="text-gray-400 text-sm">暂无关键词</p>}
        </ModuleCard>

        {/* 3. 截图内容概括 */}
        <ModuleCard emoji="📋" title="截图内容概括">
          <p className="text-gray-600 text-sm leading-relaxed">{m.screenshotSummary}</p>
        </ModuleCard>

        {/* 4. 人设类型 */}
        <ModuleCard emoji="🎭" title="引起焦虑的人设/人格化形象">
          <div className="flex flex-wrap gap-1.5">
            <span className="tag bg-amber-200 text-amber-800 font-semibold">{m.personaTypes.primary}（主）</span>
            {m.personaTypes.all.map((p, i) => <span key={i} className="tag">{p}</span>)}
          </div>
        </ModuleCard>

        {/* 5. 焦虑类型 */}
        <ModuleCard emoji="😰" title="焦虑类型">
          <div className="flex flex-wrap gap-1.5">
            <span className="tag bg-amber-200 text-amber-800 font-semibold">{m.anxietyTypes.primary}（主）</span>
            {m.anxietyTypes.all.map((a, i) => <span key={i} className="tag">{a}</span>)}
          </div>
        </ModuleCard>

        {/* 6. 包装与隐藏信息拆解 */}
        <ModuleCard emoji="🎁" title="包装与隐藏信息拆解">
          <p className="text-gray-600 text-sm leading-relaxed">{m.packagingAnalysis}</p>
        </ModuleCard>

        {/* 7. 比较陷阱分析 */}
        <ModuleCard emoji="⚖️" title="比较陷阱分析">
          <p className="text-gray-600 text-sm leading-relaxed">{m.comparisonTrapAnalysis}</p>
        </ModuleCard>

        {/* 8. 为什么你会焦虑 */}
        <ModuleCard emoji="💭" title="为什么你会焦虑">
          <p className="text-gray-600 text-sm leading-relaxed">{m.whyYouFeelAnxious}</p>
        </ModuleCard>

        {/* 9. CBT/心理学方法 */}
        <ModuleCard emoji="🔧" title="CBT/心理学方法辅助">
          <div className="bg-amber-50 rounded-xl p-3">
            <p className="text-sm font-semibold text-amber-700 mb-1">{m.cbtAssistance.methodName}</p>
            <p className="text-gray-600 text-sm leading-relaxed">{m.cbtAssistance.content}</p>
          </div>
        </ModuleCard>

        {/* 10. 具体建议 */}
        <ModuleCard emoji="💡" title="具体建议">
          {m.suggestions.length > 0 ? (
            <ol className="list-decimal pl-5 space-y-2 text-sm text-gray-600">
              {m.suggestions.map((s, i) => <li key={i} className="leading-relaxed">{s}</li>)}
            </ol>
          ) : <p className="text-gray-400 text-sm">当前信息不足，无法提供具体建议</p>}
        </ModuleCard>

        {/* 11. 相关百宝箱推荐 */}
        <ModuleCard emoji="📚" title="相关百宝箱推荐">
          {m.knowledgeRecommendations.length > 0 ? (
            <div className="space-y-2">
              {m.knowledgeRecommendations.map((r, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3 cursor-pointer hover:bg-gray-100"
                  onClick={() => router.push(`/knowledge/${r.id}`)}>
                  <p className="font-medium text-sm text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.summary}</p>
                </div>
              ))}
            </div>
          ) : <p className="text-gray-400 text-sm">暂无相关推荐</p>}
        </ModuleCard>

        {/* 12. 来源/参考依据 */}
        <ModuleCard emoji="📖" title="来源/参考依据" expanded={sourcesExpanded}
          onToggle={() => setSourcesExpanded(!sourcesExpanded)}>
          {sourcesExpanded && (
            <div className="space-y-2 mt-2">
              {m.sources.map((s, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-gray-700">{s.title}</p>
                  {s.categoryName && <p className="text-xs text-gray-400">分类：{s.categoryName}</p>}
                  <p className="text-xs text-gray-500 mt-1">{s.reason}</p>
                </div>
              ))}
            </div>
          )}
        </ModuleCard>

        {/* 13. 免责声明 */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-fade-in-up">
          <h3 className="text-sm font-semibold text-red-600 mb-1">⚠️ 免责声明</h3>
          <p className="text-xs text-red-500 leading-relaxed">{m.disclaimer.text}</p>
        </div>

        {/* 我的备注 */}
        <div className="card">
          <button onClick={() => setNoteExpanded(!noteExpanded)}
            className="w-full text-left flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">📝 我的备注</span>
            <span className="text-gray-300">{noteExpanded ? '▲' : '▼'}</span>
          </button>
          {noteExpanded && (
            <div className="mt-3 space-y-2">
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)}
                className="input-base text-sm resize-none" rows={3} maxLength={500}
                placeholder="添加你的想法…" />
              <button onClick={saveNote} className="btn-primary text-sm w-full">保存备注</button>
            </div>
          )}
        </div>
      </div>

      {/* 底部操作区 */}
      <div className="bottom-fixed flex gap-2">
        <button onClick={() => {
          if (window.history.length > 1) router.back()
          else router.push('/history')
        }} className="flex-1 btn-secondary text-xs">← 返回</button>
        <button onClick={copyAIOutput} className="flex-1 btn-secondary text-xs">📋 复制</button>
        {data.feedback.submitted ? (
          <button onClick={() => router.push(`/feedback/${recordId}`)}
            className="flex-2 btn-secondary text-sm">
            查看反馈
          </button>
        ) : (
          <button onClick={() => router.push(`/feedback/${recordId}`)}
            className="flex-2 btn-primary text-sm">
            进入反馈页
          </button>
        )}
      </div>
    </div>
  )
}

/** 可折叠模块卡片 */
function ModuleCard({
  emoji, title, children, expanded = true, onToggle
}: {
  emoji: string, title: string, children: React.ReactNode,
  expanded?: boolean, onToggle?: () => void
}) {
  return (
    <div className="card animate-fade-in-up">
      <div
        className={`flex items-center justify-between ${onToggle ? 'cursor-pointer' : ''}`}
        onClick={onToggle}
      >
        <h3 className="text-sm font-semibold text-gray-700">
          {emoji} {title}
        </h3>
        {onToggle && <span className="text-gray-300 text-xs">{expanded ? '▲' : '▼'}</span>}
      </div>
      {expanded && <div className="mt-2">{children}</div>}
    </div>
  )
}
