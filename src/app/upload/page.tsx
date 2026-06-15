'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'
import { ConfirmModal } from '@/components/common'
import { ImagePreview } from '@/components/upload/ImagePreview'
import { AnxietySlider } from '@/components/upload/AnxietySlider'
import { PlatformSelector } from '@/components/upload/PlatformSelector'

export default function UploadPage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  // 上传状态
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [fileId, setFileId] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [mimeType, setMimeType] = useState('')

  // OCR 状态
  const [ocrText, setOcrText] = useState('')
  const [ocrConfidence, setOcrConfidence] = useState(1)
  const [needManualSupplement, setNeedManualSupplement] = useState(false)
  const [manualText, setManualText] = useState('')

  // 预览弹层
  const [showPreview, setShowPreview] = useState(false)

  // 用户输入
  const [feeling, setFeeling] = useState('')
  const [anxietyScore, setAnxietyScore] = useState(0)
  const [platform, setPlatform] = useState('')
  const [referenceHistory, setReferenceHistory] = useState(false)
  const [hasHistory, setHasHistory] = useState(false)
  const [dirty, setDirty] = useState(false)

  // 离开确认
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false)
  const [pendingNav, setPendingNav] = useState('')

  // 检查是否有历史记录 + 读取偏好
  useEffect(() => {
    fetch('/api/user/preferences').then(r => r.json()).then(d => {
      if (d.success) {
        setReferenceHistory(d.data.referenceHistoryDefault)
      }
    })
    fetch('/api/home').then(r => r.json()).then(d => {
      if (d.success) setHasHistory(d.data.userState.hasHistory)
    })
  }, [])

  // 标记脏数据
  const markDirty = useCallback(() => setDirty(true), [])

  // 拦截底部导航跳转
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as HTMLElement
      const link = target.closest('a')
      if (link && dirty) {
        const href = link.getAttribute('href')
        if (href && href !== '/upload') {
          e.preventDefault()
          setPendingNav(href)
          setShowLeaveConfirm(true)
        }
      }
    }
    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [dirty])

  // 上传图片
  async function handleFile(file: File) {
    setUploadError('')
    const allowed = ['image/png', 'image/jpeg', 'image/webp']
    if (!allowed.includes(file.type)) {
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
      if (!data.success) { setUploadError(data.error?.message || '上传失败'); return }

      setFileId(data.data.fileId)
      setPreviewUrl(data.data.previewUrl)
      setMimeType(data.data.mimeType)
      markDirty()

      // 触发 OCR
      const ocrRes = await fetch('/api/ocr/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId: data.data.fileId }),
      })
      const ocrData = await ocrRes.json()
      if (ocrData.success) {
        setOcrText(ocrData.data.text)
        setOcrConfidence(ocrData.data.confidence)
        setNeedManualSupplement(ocrData.data.needManualSupplement)
      }
    } catch { setUploadError('网络异常，请重试') }
    finally { setUploading(false) }
  }

  // 点击上传
  function handleClickUpload() { fileRef.current?.click() }

  // 拖拽上传
  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const file = e.dataTransfer.files[0]
    if (file) handleFile(file)
  }
  function handleDragOver(e: React.DragEvent) { e.preventDefault() }

  return (
    <MobileLayout>
      <div className="px-6 pt-6 pb-32 space-y-5">
        <h1 className="text-xl font-bold text-gray-800">上传截图</h1>

        {/* 上传区域 */}
        {!previewUrl ? (
          <div
            onClick={handleClickUpload}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
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
                <p className="text-gray-300 text-xs mt-1 hidden sm:block">电脑端支持拖拽上传</p>
              </div>
            )}
          </div>
        ) : (
          /* 缩略图 */
          <div className="bg-white rounded-2xl p-4 space-y-3">
            <div className="relative rounded-xl overflow-hidden bg-gray-100 cursor-pointer"
              onClick={() => setShowPreview(true)}>
              <img src={previewUrl} alt="截图缩略图" className="w-full object-contain max-h-48" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/10 transition">
                <span className="text-white text-sm bg-black/50 rounded-full px-3 py-1 opacity-0 hover:opacity-100 transition">
                  点击查看大图
                </span>
              </div>
            </div>
            <button onClick={() => fileRef.current?.click()} className="text-amber-600 text-sm">
              📷 重新上传
            </button>

            {needManualSupplement && manualText && (
              <div className="bg-amber-50 rounded-xl px-3 py-2 text-xs text-amber-700">
                ✅ 已补充关键文字
              </div>
            )}
          </div>
        )}

        {/* 上传错误 */}
        {uploadError && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-600">
            {uploadError}
          </div>
        )}

        {/* 感受输入 */}
        <div className="space-y-2">
          <span className="text-sm text-gray-500">感受（可选，最多 500 字）</span>
          <textarea
            value={feeling}
            onChange={(e) => { setFeeling(e.target.value); markDirty() }}
            placeholder="可以写下你看到这张截图时的感受，比如羡慕、焦虑、烦躁、不安、被比较感压住了……"
            className="input-base text-sm resize-none"
            rows={4}
            maxLength={500}
          />
          <p className="text-xs text-gray-300 text-right">{feeling.length}/500</p>
        </div>

        {/* 焦虑强度滑块 */}
        <AnxietySlider value={anxietyScore} onChange={(v) => { setAnxietyScore(v); markDirty() }} />

        {/* 来源平台 */}
        <PlatformSelector value={platform} onChange={setPlatform} />

        {/* 参考历史开关 */}
        <div className="flex items-center justify-between py-2">
          <div>
            <span className="text-sm text-gray-500">参考我的历史摘要</span>
            <p className="text-xs text-gray-300">让本次分析更贴近我</p>
          </div>
          <button
            type="button"
            onClick={() => setReferenceHistory(!referenceHistory)}
            disabled={!hasHistory}
            className={`w-12 h-7 rounded-full transition relative ${
              !hasHistory ? 'bg-gray-200 cursor-not-allowed' :
              referenceHistory ? 'bg-amber-500' : 'bg-gray-300'
            }`}
          >
            <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition ${
              referenceHistory ? 'left-[22px]' : 'left-0.5'
            }`} />
          </button>
        </div>
        {!hasHistory && (
          <p className="text-xs text-gray-300 -mt-3">分析过更多内容后，可开启此选项</p>
        )}

        {/* 隐藏的文件选择 */}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) handleFile(file)
            e.target.value = ''
          }}
        />
      </div>

      {/* 底部开始分析按钮 */}
      <div className="bottom-fixed">
        <button
          disabled={!fileId}
          className="btn-primary w-full text-center disabled:opacity-40"
          onClick={() => {
            // Phase 7 实现：跳转分析等页
            alert('开始分析将在 Phase 7 实现\n\n当前已上传：fileId=' + fileId + '\n感受：' + (feeling || '无') + '\n焦虑强度：' + anxietyScore + '\n来源平台：' + (platform || '无') + '\n参考历史：' + referenceHistory)
          }}
        >
          开始分析
        </button>
      </div>

      {/* 图片预览弹层 */}
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

      {/* 离开确认 */}
      <ConfirmModal
        open={showLeaveConfirm}
        title="离开确认"
        message="分析尚未开始，离开后将丢失当前内容，是否确认离开？"
        confirmLabel="确认离开"
        cancelLabel="继续编辑"
        onConfirm={() => {
          setShowLeaveConfirm(false)
          setDirty(false)
          if (pendingNav) router.push(pendingNav)
        }}
        onCancel={() => setShowLeaveConfirm(false)}
      />
    </MobileLayout>
  )
}
