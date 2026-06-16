'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ConfirmModal } from '@/components/common'
import { ImagePreview } from '@/components/upload/ImagePreview'
import { AnxietySlider } from '@/components/upload/AnxietySlider'
import { PlatformSelector } from '@/components/upload/PlatformSelector'

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileId, setFileId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [imgLoadFailed, setImgLoadFailed] = useState(false)

  const [ocrText, setOcrText] = useState('')
  const [ocrConfidence, setOcrConfidence] = useState(1)
  const [needManualSupplement, setNeedManualSupplement] = useState(false)
  const [manualText, setManualText] = useState('')

  const [showPreview, setShowPreview] = useState(false)

  const [feeling, setFeeling] = useState('')
  const [anxietyScore, setAnxietyScore] = useState(0)
  const [platform, setPlatform] = useState('')
  const [referenceHistory, setReferenceHistory] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)
  const [dirty, setDirty] = useState(false)

  const [ocrRunning, setOcrRunning] = useState(false)
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingNav, setPendingNav] = useState('')

  useEffect(() => {
    fetch('/api/user/preferences').then(r => r.json()).then(d => {
      if (d.success) setReferenceHistory(d.data.referenceHistoryDefault)
    }).catch(() => {})
    fetch('/api/home').then(r => r.json()).then(d => {
      if (d.success) setHasHistory(d.data.userState.hasHistory)
    }).catch(() => {})
  }, [])

  const markDirty = useCallback(() => setDirty(true), [])

  // 离开拦截
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && dirty) {
        const href = link.getAttribute('href')
        if (href && href !== '/upload' && !href.startsWith('#')) {
          e.preventDefault()
          setPendingNav(href)
          setShowLeaveConfirm(true)
        }
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [dirty])

  async function handleFile(file: File) {
    setUploadError('')
    setImgLoadFailed(false)
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      setUploadError('仅支持 PNG、JPG、JPEG、WEBP 格式')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('图片大小超过 10MB，请重新上传')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/files/upload', { method: 'POST', body: formData })
      const data = await res.json()
      if (!data.success) { setUploadError(data.error?.message || '上传失败'); setUploading(false); return }

      const fid = data.data.fileId
      const purl = data.data.previewUrl
      setFileId(fid)
      setPreviewUrl(purl)
      markDirty()
      setUploading(false)

      // OCR 跳过（分析 API 会直接识别图片文字）
      // 避免浪费一次 AI 请求触发限流
      setNeedManualSupplement(false)
      setOcrText('')
    } catch {
      if (!fileId) setUploadError('网络异常，请重试')
    }
  }

  return (
    <div className="min-h-screen bg-amber-50 flex flex-col">
      <div className="flex-1 px-6 pt-6 pb-28 space-y-5 max-w-lg mx-auto w-full">
        <h1 className="text-xl font-bold text-gray-800">上传截图</h1>

        {/* 上传区域 */}
        {!previewUrl ? (
          <div
            onClick={() => fileRef.current?.click()}
            onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed border-amber-300 rounded-2xl p-10 text-center cursor-pointer
              hover:border-amber-400 hover:bg-amber-50/50 transition bg-white"
          >
            {uploading ? (
              <div className="space-y-3">
                <div className="w-10 h-10 mx-auto border-3 border-amber-200 border-t-amber-600 rounded-full animate-spin" />
                <p className="text-gray-400 text-sm">上传中…</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="text-4xl">📷</div>
                <p className="text-gray-500 text-sm">点击选择图片或拖拽上传</p>
                <p className="text-gray-300 text-xs">支持 PNG、JPG、JPEG、WEBP，最大 10MB</p>
                <button type="button" className="btn-primary text-sm mt-2"
                  onClick={(e) => { e.stopPropagation(); fileRef.current?.click() }}>
                  选择图片
                </button>
              </div>
            )}
          </div>
        ) : (
          /* 缩略图 */
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div
              className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer min-h-[120px] flex items-center justify-center"
              onClick={() => setShowPreview(true)}
            >
              {imgLoadFailed ? (
                <div className="text-center p-4">
                  <p className="text-4xl mb-2">🖼️</p>
                  <p className="text-gray-400 text-sm">图片已上传</p>
                  <p className="text-amber-500 text-xs mt-1">点击查看大图</p>
                </div>
              ) : (
                <>
                  <img
                    src={previewUrl}
                    alt="截图缩略图"
                    className="w-full object-contain max-h-48"
                    onError={() => setImgLoadFailed(true)}
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition">
                    <span className="text-white text-sm bg-black/50 rounded-full px-3 py-1 opacity-0 hover:opacity-100 transition">
                      点击查看大图
                    </span>
                  </div>
                </>
              )}
            </div>
            <button onClick={() => { fileRef.current?.click() }} className="text-amber-600 text-sm">
              📷 重新上传
            </button>

            {/* OCR 状态 */}
            {ocrRunning && (
              <div className="bg-blue-50 rounded-xl px-3 py-2 text-xs text-blue-600 flex items-center gap-2">
                <span className="w-3 h-3 border-2 border-blue-400 border-t-blue-600 rounded-full animate-spin" />
                正在识别图片文字…（10 秒）
              </div>
            )}
            {!ocrRunning && needManualSupplement && manualText && (
              <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700">
                ✅ 已补充关键文字（{manualText.length}字）
              </div>
            )}
            {!ocrRunning && needManualSupplement && !manualText && (
              <div className="bg-red-50 rounded-xl px-3 py-2 text-xs text-red-600">
                ⚠️ 文字识别困难，建议点击上方图片补充关键文字
              </div>
            )}
            {!ocrRunning && !needManualSupplement && ocrText && (
              <div className="bg-green-50 rounded-xl px-3 py-2 text-xs text-green-600">
                ✅ 文字识别完成
              </div>
            )}
          </div>
        )}

        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">{uploadError}</div>
        )}

        {/* 感受 */}
        <div className="space-y-2">
          <span className="text-sm text-gray-500">感受（可选，最多 500 字）</span>
          <textarea value={feeling} onChange={e => { setFeeling(e.target.value); markDirty() }}
            placeholder="可以写下你看到这张截图时的感受……"
            className="input-base text-sm resize-none" rows={4} maxLength={500} />
          <p className="text-xs text-gray-300 text-right">{feeling.length}/500</p>
        </div>

        <AnxietySlider value={anxietyScore} onChange={v => { setAnxietyScore(v); markDirty() }} />
        <PlatformSelector value={platform} onChange={setPlatform} />

        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm text-gray-500">参考我的历史摘要</span>
            <p className="text-xs text-gray-300">让本次分析更贴近我</p>
          </div>
          <button type="button" onClick={() => setReferenceHistory(!referenceHistory)} disabled={!hasHistory}
            className={`w-12 h-7 rounded-full transition relative ${!hasHistory ? 'bg-gray-200 cursor-not-allowed' : referenceHistory ? 'bg-amber-500' : 'bg-gray-300'}`}>
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition ${referenceHistory ? 'left-[22px]' : 'left-0.5'}`} />
          </button>
        </div>
        {!hasHistory && <p className="text-xs text-gray-300 -mt-3">分析过更多内容后，可开启此选项</p>}

        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }} />
      </div>

      {/* 底部按钮 — 固定在底部导航上方 */}
      <div className="sticky bottom-16 left-0 right-0 bg-white border-t border-gray-100 px-6 py-3 z-30"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom, 0px))' }}>
        <button
          disabled={!fileId}
          className="btn-primary w-full text-center disabled:opacity-40"
          onClick={() => {
            const params = new URLSearchParams()
            params.set('fileId', fileId!)
            if (feeling) params.set('feeling', feeling)
            params.set('anxiety', String(anxietyScore))
            if (platform) params.set('platform', platform)
            params.set('refHistory', String(referenceHistory))
            if (manualText) params.set('manual', manualText)
            router.push(`/analysis?${params.toString()}`)
          }}
        >
          开始分析
        </button>
      </div>

      {/* 底部导航 — 用 MobileLayout 手动管理 */}
      <nav className="flex justify-around items-center fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 py-2 z-50"
        style={{ paddingBottom: 'calc(0.5rem + env(safe-area-inset-bottom, 0px))' }}>
        <a href="/home" className="flex flex-col items-center gap-0.5 px-2 text-gray-400">
          <span className="text-xl">🏠</span><span className="text-xs">首页</span>
        </a>
        <a href="/features" className="flex flex-col items-center gap-0.5 px-2 text-gray-400">
          <span className="text-xl">🧭</span><span className="text-xs">功能</span>
        </a>
        <a href="/upload" className="flex flex-col items-center">
          <div className="w-14 h-14 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center -mt-5 shadow-lg shadow-amber-200 text-white text-xl">📷</div>
        </a>
        <a href="/knowledge" className="flex flex-col items-center gap-0.5 px-2 text-gray-400">
          <span className="text-xl">📚</span><span className="text-xs">百宝箱</span>
        </a>
        <a href="/profile" className="flex flex-col items-center gap-0.5 px-2 text-gray-400">
          <span className="text-xl">👤</span><span className="text-xs">我的</span>
        </a>
      </nav>

      <ImagePreview
        open={showPreview}
        previewUrl={previewUrl || ''}
        ocrText={ocrText}
        needManualSupplement={needManualSupplement}
        manualText={manualText}
        onManualTextChange={setManualText}
        onClose={() => setShowPreview(false)}
        onReupload={() => { setShowPreview(false); fileRef.current?.click() }}
      />

      <ConfirmModal
        open={showLeaveConfirm}
        title="离开确认"
        message="分析尚未开始，离开后将丢失当前内容，是否确认离开？"
        confirmLabel="确认离开" cancelLabel="继续编辑"
        onConfirm={() => { setShowLeaveConfirm(false); setDirty(false); if (pendingNav) router.push(pendingNav) }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </div>
  )
}
