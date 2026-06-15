import { aiConfig } from '@/config/ai.config'

interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | AIContentPart[]
}

interface AIContentPart {
  type: 'text' | 'image_url'
  text?: string
  image_url?: { url: string }
}

interface AICompletionRequest {
  messages: AIMessage[]
  maxTokens?: number
  temperature?: number
}

interface AICompletionResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
  }
}

/**
 * DeepSeek AI Adapter
 * 支持多模态（图片 + 文字）
 */
export async function chatCompletion(req: AICompletionRequest): Promise<AICompletionResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY || aiConfig.deepseek.apiKey

  if (!apiKey) {
    throw new Error('DEEPSEEK_API_KEY not configured')
  }

  const response = await fetch(`${aiConfig.deepseek.baseUrl}/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: aiConfig.deepseek.model,
      messages: req.messages,
      max_tokens: req.maxTokens || aiConfig.deepseek.maxTokens,
      temperature: req.temperature ?? aiConfig.deepseek.temperature,
      stream: false,
    }),
    signal: AbortSignal.timeout(aiConfig.timeoutMs),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`AI API error: ${response.status} - ${err}`)
  }

  const data = await response.json()
  const message = data.choices?.[0]?.message

  return {
    content: message?.content || '',
    usage: data.usage
      ? { promptTokens: data.usage.prompt_tokens, completionTokens: data.usage.completion_tokens }
      : undefined,
  }
}

/**
 * 将图片 Buffer 转为 Base64 Data URL（用于多模态输入）
 */
export function imageToDataUrl(buffer: Buffer, mimeType: string): string {
  const base64 = buffer.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

/**
 * 构建分析用的 System Prompt
 */
export function buildAnalysisSystemPrompt(): string {
  return `你是一个社交媒体焦虑分析助手，名字叫"精神避难所"。你的任务是帮助用户从社交媒体引发的焦虑、不安、比较和自我否定中抽离出来。

## 核心原则
1. 优先基于提供的知识内容体系输出，不凭空编造
2. 语气温柔、清醒、不冷漠、不说教
3. 不使用医疗诊断语言，不替代专业医疗/心理咨询/心理治疗
4. 信息不足时不强行判断，诚实说明"当前信息不足"

## 输出格式要求（严格遵守 JSON Schema）
你必须返回一个 JSON 对象，包含以下字段：`
}

/**
 * 构建分析用的 User Prompt
 */
export function buildAnalysisUserPrompt(params: {
  ocrText?: string
  manualText?: string
  userFeelingText?: string
  anxietyScore?: number
  sourcePlatform?: string
  knowledgeContext?: string
  historyContext?: string
}): string {
  const parts: string[] = []

  parts.push('请分析这张社交媒体截图。')

  if (params.ocrText) {
    parts.push(`\n## OCR 识别文字\n${params.ocrText}`)
  }
  if (params.manualText) {
    parts.push(`\n## 用户补充说明\n${params.manualText}`)
  }
  if (params.userFeelingText) {
    parts.push(`\n## 用户感受\n${params.userFeelingText}`)
  }
  if (params.anxietyScore !== undefined && params.anxietyScore !== null) {
    parts.push(`\n## 焦虑强度（0-10）\n${params.anxietyScore}/10`)
  }
  if (params.sourcePlatform) {
    parts.push(`\n## 截图来源平台\n${params.sourcePlatform}`)
  }
  if (params.knowledgeContext) {
    parts.push(`\n## 参考知识\n${params.knowledgeContext}`)
  }
  if (params.historyContext) {
    parts.push(`\n## 用户历史分析摘要\n${params.historyContext}`)
  }

  return parts.join('\n')
}
