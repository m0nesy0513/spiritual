/**
 * OCR 文字提取 — 使用 AI 多模态能力
 */
import { chatCompletion, imageToDataUrl } from '@/lib/ai'

export interface OCRResult {
  text: string
  confidence: number
  needManualSupplement: boolean
}

export async function recognizeImageText(
  _imageBuffer: Buffer,
  _mimeType: string,
): Promise<OCRResult> {
  // 跳过独立 OCR：分析 API 已包含多模态图片识别
  // 省下一次 AI 请求，避免触发速率限制
  return { text: '', confidence: 0, needManualSupplement: true }
}
