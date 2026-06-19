'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Loading, ErrorState } from '@/components/common'

const TABS = [
  { key: 'knowledge', label: '百宝箱管理' },
  { key: 'content', label: '首页内容' },
  { key: 'suggestions', label: '用户反馈' },
  { key: 'admins', label: '管理员' },
] as const

export default function AdminPage() {
  const router = useRouter()
  const [tab, setTab] = useState<string>('knowledge')
  const [admin, setAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 简单检查权限
    fetch('/api/admin/knowledge?page=1')
      .then(r => r.json())
      .then(json => { if (json.success) setAdmin(true); else router.push('/home') })
      .catch(() => router.push('/home'))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <Loading fullScreen text="加载管理后台…" />
  if (!admin) return null

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24">
        {/* 顶栏 */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-lg font-bold text-gray-800">管理后台</h1>
          <button onClick={() => router.push('/home')} className="text-sm text-gray-500">← 回首页</button>
        </div>

        {/* Tab */}
        <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 shadow-sm">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition ${
                tab === t.key ? 'bg-amber-500 text-white shadow' : 'text-gray-500'
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* 内容 */}
        {tab === 'knowledge' && <KnowledgeManager />}
        {tab === 'content' && <ContentManager />}
        {tab === 'suggestions' && <SuggestionsManager />}
        {tab === 'admins' && <AdminManager />}
      </div>
    </div>
  )
}

// ==================== 百宝箱管理 ====================

function KnowledgeManager() {
  const [items, setItems] = useState<any[]>([])
  const [categories, setCategories] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState(0)
  const [editing, setEditing] = useState<any>(null)
  const [showForm, setShowForm] = useState(false)
  const [total, setTotal] = useState(0)
  const composingRef = useRef(false)

  const formInit = { id: 0, title: '', body: '', categoryId: 1, applicableScene: '', sourceNote: '', isHomeRecommended: false, isEnabled: true, tags: '' }
  const [form, setForm] = useState(formInit)

  useEffect(() => { loadItems() }, [categoryFilter])

  async function loadItems() {
    setLoading(true)
    const p = new URLSearchParams({ page: '1', pageSize: '200' })
    if (categoryFilter > 0) p.set('categoryId', String(categoryFilter))
    if (search.trim()) p.set('search', search.trim())
    try {
      const res = await fetch(`/api/admin/knowledge?${p}`)
      const json = await res.json()
      if (json.success) {
        setItems(json.data.items)
        setCategories(json.data.categories)
        setTotal(json.data.pagination.total)
      }
    } catch {} finally { setLoading(false) }
  }

  function doSearch(v: string) {
    setSearch(v)
    if (!composingRef.current) { clearTimeout((doSearch as any).t); (doSearch as any).t = setTimeout(loadItems, 400) }
  }

  function edit(item: any) {
    setForm({
      id: item.id, title: item.title, body: item.body, categoryId: item.categoryId,
      applicableScene: item.applicableScene || '', sourceNote: item.sourceNote || '',
      isHomeRecommended: item.isHomeRecommended, isEnabled: item.isEnabled,
      tags: (item.tags || []).join('，'),
    })
    setEditing(item)
    setShowForm(true)
  }

  function create() {
    setForm({ ...formInit, categoryId: categories[0]?.id || 1 })
    setEditing(null)
    setShowForm(true)
  }

  async function save() {
    const payload = {
      categoryId: form.categoryId, title: form.title, body: form.body,
      applicableScene: form.applicableScene, sourceNote: form.sourceNote,
      isHomeRecommended: form.isHomeRecommended, isEnabled: form.isEnabled,
      tags: form.tags.split(/[,，]/).map((t: string) => t.trim()).filter(Boolean),
    }
    const url = form.id ? `/api/admin/knowledge/${form.id}` : '/api/admin/knowledge'
    const method = form.id ? 'PATCH' : 'POST'
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
    const json = await res.json()
    if (json.success) { setShowForm(false); loadItems() }
    else alert(json.error?.message || '保存失败')
  }

  async function remove(id: number) {
    if (!confirm('确定删除？')) return
    await fetch(`/api/admin/knowledge/${id}`, { method: 'DELETE' })
    loadItems()
  }

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center bg-white rounded-xl px-4 py-2.5 shadow-sm">
          <input type="text" value={search}
            onChange={e => doSearch(e.target.value)}
            onCompositionStart={() => { composingRef.current = true }}
            onCompositionEnd={e => { composingRef.current = false; doSearch((e.target as HTMLInputElement).value) }}
            placeholder="搜索…" className="flex-1 text-sm bg-transparent outline-none" />
        </div>
        <button onClick={create} className="btn-primary text-sm px-4 py-2.5 shrink-0 whitespace-nowrap">+ 新建</button>
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto hide-scrollbar">
        <button onClick={() => setCategoryFilter(0)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${categoryFilter===0?'bg-amber-500 text-white':'bg-white text-gray-500 border'}`}>全部 ({total})</button>
        {categories.map((c: any) => (
          <button key={c.id} onClick={() => setCategoryFilter(c.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs ${categoryFilter===c.id?'bg-amber-500 text-white':'bg-white text-gray-500 border'}`}>{c.name}</button>
        ))}
      </div>

      {loading ? <Loading text="加载…" /> : (
        <div className="space-y-2">
          {items.map((item: any) => (
            <div key={item.id} className={`bg-white rounded-xl p-4 shadow-sm ${!item.isEnabled ? 'opacity-50' : ''}`}>
              <div className="flex items-start justify-between gap-2 mb-1">
                <div>
                  <span className="text-xs text-gray-400">{item.categoryName}</span>
                  <p className="text-sm font-medium text-gray-800">{item.title}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => edit(item)} className="text-xs text-amber-600 px-2 py-1">编辑</button>
                  <button onClick={() => remove(item.id)} className="text-xs text-red-400 px-2 py-1">删除</button>
                </div>
              </div>
              <div className="flex gap-1 flex-wrap">
                {item.tags.map((t: string) => <span key={t} className="text-xs text-amber-600">#{t}</span>)}
              </div>
              <div className="flex gap-2 mt-1 text-xs text-gray-400">
                {item.isHomeRecommended && <span>🏠 推荐</span>}
                {!item.isEnabled && <span>⏸ 已停用</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 编辑弹窗 */}
      {showForm && (
        <div className="fullscreen-overlay z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl mx-3 p-5 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold mb-4">{form.id ? '编辑' : '新建'}知识条目</h3>
            <div className="space-y-3 text-sm">
              <div>
                <label className="text-xs text-gray-400">分类</label>
                <select value={form.categoryId} onChange={e => setForm({...form, categoryId: parseInt(e.target.value)})}
                  className="input-base text-sm mt-1">
                  {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400">标题</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="input-base text-sm mt-1" maxLength={60} />
              </div>
              <div>
                <label className="text-xs text-gray-400">正文（Markdown）</label>
                <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})}
                  className="input-base text-sm mt-1 resize-none" rows={8} />
              </div>
              <div>
                <label className="text-xs text-gray-400">适用场景</label>
                <input value={form.applicableScene} onChange={e => setForm({...form, applicableScene: e.target.value})} className="input-base text-sm mt-1" maxLength={200} />
              </div>
              <div>
                <label className="text-xs text-gray-400">来源引用</label>
                <input value={form.sourceNote} onChange={e => setForm({...form, sourceNote: e.target.value})} className="input-base text-sm mt-1" maxLength={200} />
              </div>
              <div>
                <label className="text-xs text-gray-400">标签（逗号分隔）</label>
                <input value={form.tags} onChange={e => setForm({...form, tags: e.target.value})} className="input-base text-sm mt-1" />
              </div>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.isEnabled} onChange={e => setForm({...form, isEnabled: e.target.checked})} /> 启用
                </label>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={form.isHomeRecommended} onChange={e => setForm({...form, isHomeRecommended: e.target.checked})} /> 首页推荐
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setShowForm(false)} className="flex-1 btn-secondary text-sm">取消</button>
              <button onClick={save} className="flex-1 btn-primary text-sm">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ==================== 首页内容管理 ====================

function ContentManager() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<any>(null)
  const [subTab, setSubTab] = useState<'quotes' | 'songs' | 'contents'>('quotes')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/home-content')
    const json = await res.json()
    if (json.success) setData(json.data)
    setLoading(false)
  }

  async function saveQuote(quote: any) {
    const url = '/api/admin/home-content/quotes'
    const method = quote.id ? 'PATCH' : 'POST'
    if (!quote.id) quote.id = undefined
    await fetch(method === 'POST' ? url : url, {
      method: method === 'POST' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(quote),
    })
    load()
  }

  async function deleteQuote(id: number) {
    if (!confirm('确定删除？')) return
    await fetch(`/api/admin/home-content/quotes?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function saveSong(song: any) {
    const url = '/api/admin/home-content/songs'
    const method = song.id ? 'PATCH' : 'POST'
    await fetch(method === 'POST' ? url : url, {
      method: method === 'POST' ? 'POST' : 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(song),
    })
    load()
  }

  async function deleteSong(id: number) {
    if (!confirm('确定删除？')) return
    await fetch(`/api/admin/home-content/songs?id=${id}`, { method: 'DELETE' })
    load()
  }

  async function saveContent(content: any) {
    await fetch('/api/admin/home-content', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(content),
    })
    load()
  }

  if (loading) return <Loading text="加载…" />
  if (!data) return null

  return (
    <div>
      {/* 子 Tab */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm">
        {[
          { key: 'quotes', label: '名言' },
          { key: 'songs', label: '好歌' },
          { key: 'contents', label: '文案' },
        ].map(t => (
          <button key={t.key} onClick={() => setSubTab(t.key as any)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition ${subTab===t.key ? 'bg-amber-500 text-white' : 'text-gray-500'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 名言 */}
      {subTab === 'quotes' && (
        <div className="space-y-2">
          <button onClick={() => { const t = { id: 0, text: '', author: '', isEnabled: true }; setEditItem({...t}); }}
            className="btn-primary text-xs px-4 py-2 mb-2">+ 新增名言</button>
          {data.quotes.map((q: any, i: number) => (
            <div key={i} className={`bg-white rounded-xl p-3 shadow-sm ${!q.isEnabled ? 'opacity-50' : ''}`}>
              <p className="text-sm text-gray-700">"{q.text}"</p>
              <p className="text-xs text-gray-400 mt-0.5">— {q.author}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditItem({...q})} className="text-xs text-amber-600">编辑</button>
                <button onClick={() => deleteQuote(q.id)} className="text-xs text-red-400">删除</button>
              </div>
            </div>
          ))}
          {editItem && ('text' in editItem) && (
            <div className="fullscreen-overlay z-50" onClick={() => setEditItem(null)}>
              <div className="bg-white rounded-2xl mx-3 p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-3">{editItem.id ? '编辑' : '新增'}名言</h3>
                <textarea value={editItem.text} onChange={e => setEditItem({...editItem, text: e.target.value})}
                  className="input-base text-sm mb-2 resize-none" rows={2} placeholder="名言内容" maxLength={50} />
                <input value={editItem.author} onChange={e => setEditItem({...editItem, author: e.target.value})}
                  className="input-base text-sm mb-2" placeholder="作者" maxLength={50} />
                <label className="flex items-center gap-2 text-xs mb-4"><input type="checkbox" checked={editItem.isEnabled} onChange={e => setEditItem({...editItem, isEnabled: e.target.checked})} /> 启用</label>
                <div className="flex gap-3">
                  <button onClick={() => setEditItem(null)} className="flex-1 btn-secondary text-sm">取消</button>
                  <button onClick={() => { saveQuote(editItem); setEditItem(null); }} className="flex-1 btn-primary text-sm">保存</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 好歌 */}
      {subTab === 'songs' && (
        <div className="space-y-2">
          <button onClick={() => { const s = { id: 0, title: '', artist: '', reason: '', suitableMood: '', isEnabled: true }; setEditItem(s); }}
            className="btn-primary text-xs px-4 py-2 mb-2">+ 新增好歌</button>
          {data.songs.map((s: any, i: number) => (
            <div key={i} className={`bg-white rounded-xl p-3 shadow-sm ${!s.isEnabled ? 'opacity-50' : ''}`}>
              <p className="text-sm font-medium text-gray-700">{s.title} — {s.artist}</p>
              <p className="text-xs text-gray-400 mt-0.5">{s.reason} · {s.suitableMood}</p>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditItem({...s})} className="text-xs text-amber-600">编辑</button>
                <button onClick={() => deleteSong(s.id)} className="text-xs text-red-400">删除</button>
              </div>
            </div>
          ))}
          {editItem && ('artist' in editItem) && (
            <div className="fullscreen-overlay z-50" onClick={() => setEditItem(null)}>
              <div className="bg-white rounded-2xl mx-3 p-5 max-w-sm w-full" onClick={e => e.stopPropagation()}>
                <h3 className="text-base font-bold mb-3">{editItem.id ? '编辑' : '新增'}好歌</h3>
                <input value={editItem.title} onChange={e => setEditItem({...editItem, title: e.target.value})} className="input-base text-sm mb-2" placeholder="歌名" maxLength={100} />
                <input value={editItem.artist} onChange={e => setEditItem({...editItem, artist: e.target.value})} className="input-base text-sm mb-2" placeholder="歌手" maxLength={100} />
                <input value={editItem.reason} onChange={e => setEditItem({...editItem, reason: e.target.value})} className="input-base text-sm mb-2" placeholder="推荐理由" maxLength={50} />
                <input value={editItem.suitableMood} onChange={e => setEditItem({...editItem, suitableMood: e.target.value})} className="input-base text-sm mb-2" placeholder="适合心情" maxLength={50} />
                <label className="flex items-center gap-2 text-xs mb-4"><input type="checkbox" checked={editItem.isEnabled} onChange={e => setEditItem({...editItem, isEnabled: e.target.checked})} /> 启用</label>
                <div className="flex gap-3">
                  <button onClick={() => setEditItem(null)} className="flex-1 btn-secondary text-sm">取消</button>
                  <button onClick={() => { saveSong(editItem); setEditItem(null); }} className="flex-1 btn-primary text-sm">保存</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 系统文案 */}
      {subTab === 'contents' && (
        <div className="space-y-4">
          {data.contents.map((c: any) => (
            <div key={c.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-700">{c.title}</h3>
                <label className="flex items-center gap-2 text-xs">
                  <input type="checkbox" checked={c.isEnabled}
                    onChange={e => saveContent({ id: c.id, isEnabled: e.target.checked, title: c.title, body: c.body })} />
                  启用
                </label>
              </div>
              <textarea
                value={c.body}
                onChange={e => { const v = e.target.value; setData((prev: any) => ({ ...prev, contents: prev.contents.map((x: any) => x.id === c.id ? {...x, body: v} : x) })) }}
                onBlur={e => saveContent({ id: c.id, title: c.title, body: e.target.value, isEnabled: c.isEnabled })}
                className="input-base text-xs resize-none" rows={4} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ==================== 用户反馈 ====================

function SuggestionsManager() {
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/suggestions?page=1&pageSize=200')
    const json = await res.json()
    if (json.success) setItems(json.data.suggestions)
    setLoading(false)
  }

  if (loading) return <Loading text="加载…" />

  return (
    <div className="space-y-2">
      {items.length === 0 && <p className="text-center text-gray-400 text-sm py-8">暂无用户反馈</p>}
      {items.map((s: any) => (
        <div key={s.id} className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{s.displayName} · {new Date(s.createdAt).toLocaleDateString('zh-CN')}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${s.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
              {s.status === 'pending' ? '待处理' : s.status === 'adopted' ? '已采纳' : s.status === 'completed' ? '已完成' : s.status}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-1">类型：{s.type}</p>
          <p className="text-sm text-gray-700">{s.content}</p>
          {s.contact && <p className="text-xs text-gray-400 mt-1">联系方式：{s.contact}</p>}
        </div>
      ))}
    </div>
  )
}

// ==================== 管理员管理 ====================

function AdminManager() {
  const [admins, setAdmins] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [credType, setCredType] = useState<'phone' | 'email'>('phone')
  const [credValue, setCredValue] = useState('')
  const [adding, setAdding] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => { load() }, [])

  async function load() {
    const res = await fetch('/api/admin/users')
    const json = await res.json()
    if (json.success) setAdmins(json.data.admins)
    setLoading(false)
  }

  async function addAdmin() {
    if (!credValue.trim()) return
    setAdding(true)
    setMsg('')
    const res = await fetch('/api/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credentialType: credType, credentialValue: credValue.trim() }),
    })
    const json = await res.json()
    if (json.success) {
      setMsg(json.data.existed ? `⚠ ${json.data.message}` : `✅ 已添加 ${json.data.username}`)
      setCredValue('')
      load()
    } else {
      setMsg(`❌ ${json.error?.message || '失败'}`)
    }
    setAdding(false)
  }

  async function removeAdmin(userId: number) {
    if (!confirm('确定移除该管理员？')) return
    const res = await fetch(`/api/admin/users?userId=${userId}`, { method: 'DELETE' })
    const json = await res.json()
    if (json.success) load()
    else alert(json.error?.message || '移除失败')
  }

  if (loading) return <Loading text="加载…" />

  return (
    <div className="space-y-4">
      {/* 添加 */}
      <div className="bg-white rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-medium text-gray-700">添加管理员</h3>
        <p className="text-xs text-gray-400">输入已注册用户的手机号或邮箱来授予管理员权限</p>
        <div className="flex gap-2">
          <select value={credType} onChange={e => setCredType(e.target.value as any)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white shrink-0">
            <option value="phone">手机号</option>
            <option value="email">邮箱</option>
          </select>
          <input type="text" value={credValue} onChange={e => setCredValue(e.target.value)}
            placeholder={credType === 'phone' ? '输入手机号' : '输入邮箱'}
            className="input-base text-sm flex-1" />
          <button onClick={addAdmin} disabled={adding}
            className="btn-primary text-sm px-4 py-2 shrink-0 disabled:opacity-50">
            {adding ? '添加中…' : '添加'}
          </button>
        </div>
        {msg && <p className={`text-xs ${msg.startsWith('✅') ? 'text-green-600' : msg.startsWith('⚠') ? 'text-amber-600' : 'text-red-500'}`}>{msg}</p>}
      </div>

      {/* 列表 */}
      <div className="bg-white rounded-xl shadow-sm divide-y divide-gray-50">
        {admins.length === 0 && <p className="text-center text-gray-400 text-sm py-6">暂无管理员</p>}
        {admins.map((a: any) => (
          <div key={a.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <p className="text-sm font-medium text-gray-700">{a.username}</p>
              <p className="text-xs text-gray-400">{a.role === 'super_admin' ? '超级管理员' : '管理员'} · {new Date(a.createdAt).toLocaleDateString('zh-CN')}</p>
            </div>
            <button onClick={() => removeAdmin(a.userId)}
              className="text-xs text-red-400 px-3 py-1 rounded-lg hover:bg-red-50">
              移除
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
