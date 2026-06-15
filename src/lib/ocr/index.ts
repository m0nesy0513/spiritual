/**
 * OCR 文字提取（由 DeepSeeK 多模态能力处理）
 * 不单独接入第三方 OCR 服务
 */
import { chatCompletion, imageToDataUrl } from '@/lib/ai'

export interface OCRResult {
  text: string
  confidence: number // 0-1
  needManualSupplement: boolean
}

/**
 * 对截图进行文字识别
 * 使用多模态 AI 直接识别图片中的文字
 */
export async function recognizeImageText(
  imageBuffer: Buffer,
  mimeType: string,
): Promise<OCRResult> {
  const dataUrl = imageToDataUrl(imageBuffer, mimeType)

  try {
    const response = await chatCompletion({
      messages: [
        {
          role: 'system',
          content: '你是一个文字识别助手。请识别图片中的所有文字，以纯文本形式输出。如果图片中没有文字或文字完全无法辨认，请输出 <NO_TEXT>。不要添加任何解释，只输出识别结果。',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: '请识别图片中的文字。' },
          ],
        },
      ],
      temperature: 0.1,
    })

    const text = response.content.trim()

    if (!text || text === '<NO_TEXT>') {
      return { text: '', confidence: 0, needManualSupplement: true }
    }

    // 简单估算置信度：太短或太长没有标点都算低置信度
    const hasChineseOrEnglish = /[一-鿿]|[a-zA-Z]/.test(text)
    const confidence = hasChineseOrEnglish
      ? text.length > 5 ? 0.8 : 0.5
      : 0.3

    return {
      text,
      confidence,
      needManualSupplement: confidence < 0.6,
    }
  } catch {
    // OCR 失败时允许手动补充
    return { text: '', confidence: 0, needManualSupplement: true }
  }
}
