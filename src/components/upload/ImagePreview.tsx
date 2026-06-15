'use client'

interface ImagePreviewProps {
  open: boolean
  previewUrl: string
  ocrText: string
  needManualSupplement: boolean
  manualText: string
  onManualTextChange: (text: string) => void
  onClose: () => void
  onReupload: () => void
  /** 是否为历史详情页模式（禁用重传） */
  readonly?: boolean
}

export function ImagePreview({
  open,
  previewUrl,
  ocrText,
  needManualSupplement,
  manualText,
  onManualTextChange,
  onClose,
  onReupload,
  readonly = false,
}: ImagePreviewProps) {
  if (!open) return null

  return (
    <div className="fullscreen-overlay z-50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl mx-4 p-4 max-w-lg w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 大图 */}
        <div className="rounded-xl overflow-hidden bg-gray-100 mb-4">
          <img src={previewUrl} alt="截图预览" className="w-full object-contain max-h-[50vh]" />
        </div>

        {/* OCR 结果 */}
        {ocrText ? (
          <div className="bg-gray-50 rounded-xl p-3 mb-3">
            <p className="text-xs text-gray-400 mb-1">识别文字</p>
            <p className="text-sm text-gray-600">{ocrText}</p>
          </div>
        ) : (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3">
            <p className="text-sm text-amber-700">图片文字识别困难，建议手动补充关键文字</p>
          </div>
        )}

        {/* 手动补充关键文字 */}
        {needManualSupplement && !readonly && (
          <div className="mb-3">
            <p className="text-xs text-gray-400 mb-1">手动补充关键文字（可选）</p>
            <textarea
              value={manualText}
              onChange={(e) => onManualTextChange(e.target.value)}
              placeholder="描述截图中的文字内容，例如：朋友圈文案提到了保研、旅行和实习..."
              className="input-base text-sm resize-none"
              rows={3}
              maxLength={200}
            />
            <p className="text-xs text-gray-300 text-right mt-1">{manualText.length}/200</p>
          </div>
        )}

        {/* 按钮 */}
        <div className="flex gap-3">
          {!readonly && (
            <button onClick={onReupload} className="flex-1 btn-secondary text-sm">
              重新上传
            </button>
          )}
          <button onClick={onClose} className="flex-1 btn-primary text-sm">
            确认
          </button>
        </div>
      </div>
    </div>
  )
}
