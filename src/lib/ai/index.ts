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

async function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)) }

export async function chatCompletion(
  req: AICompletionRequest,
  retryCount = 0,
): Promise<AICompletionResponse> {
  const apiKey = process.env.DEEPSEEK_API_KEY || aiConfig.deepseek.apiKey
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY not configured')

  const url = `${aiConfig.deepseek.baseUrl}${aiConfig.deepseek.chatPath || '/v1/chat/completions'}`

  try {
    const response = await fetch(url, {
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

    if (response.status === 429 && retryCount < 5) {
      const delay = (retryCount + 1) * 5000 // 5s, 10s, 15s, 20s, 25s 退避
      console.log(`[AI] Rate limited (attempt ${retryCount + 1}/5), waiting ${delay}ms...`)
      await sleep(delay)
      return chatCompletion(req, retryCount + 1)
    }

    // 智谱 API 间歇性 400（参数校验抖动等），重试一次
    if (response.status === 400 && retryCount < 1) {
      const errText = await response.text()
      console.log(`[AI] Bad request (attempt ${retryCount + 1}/2), body: ${errText.slice(0, 200)}`)
      await sleep(2000)
      return chatCompletion(req, retryCount + 1)
    }

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
  } catch (err: any) {
    // 网络错误也重试一次
    if (retryCount < 1 && err?.name !== 'TimeoutError' && !err?.message?.includes('AI API error')) {
      await sleep(2000)
      return chatCompletion(req, retryCount + 1)
    }
    throw err
  }
}

/** 将图片 Buffer 转为 Base64 Data URL，自动压缩大图 */
export function imageToDataUrl(buffer: Buffer, mimeType: string): string {
  // 大图用 WebP quality 参数没有意义，直接传但限制分辨率提示
  // 对于 > 2MB 的图片，只传前 1.5MB（足够看清文字和内容）
  const MAX_BYTES = 1_500_000
  const data = buffer.length > MAX_BYTES ? buffer.subarray(0, MAX_BYTES) : buffer
  const base64 = data.toString('base64')
  return `data:${mimeType};base64,${base64}`
}

export function buildAnalysisSystemPrompt(): string {
  return `你是一个社交媒体焦虑分析助手，名字叫"精神避难所"。你的任务是帮助用户从社交媒体引发的焦虑、不安、比较和自我否定中抽离出来。

## 核心原则
1. 优先基于提供的知识内容体系输出，不凭空编造
2. 语气温柔、清醒、不冷漠、不说教
3. 不使用医疗诊断语言，不替代专业医疗/心理咨询/心理治疗
4. 信息不足时不强行判断，诚实说明"当前信息不足"
5. 禁止使用 Markdown 格式化标记（如 **粗体**、## 标题等），所有字段输出纯文本

## 输出格式要求
你必须严格输出一个 JSON 对象，字段如下：
{
  "oneSentenceSummary": "一句话摘要，最多30字",
  "keywords": ["关键词1", ...],
  "screenshotSummary": "截图内容概括，最多100字",
  "personaTypes": { "primary": "主人设", "all": ["人设1"] },
  "anxietyTypes": { "primary": "主焦虑类型", "all": ["类型1"] },
  "packagingAnalysis": "包装与隐藏信息拆解",
  "comparisonTrapAnalysis": "比较陷阱分析",
  "whyYouFeelAnxious": "为什么会焦虑",
  "cbtAssistance": { "methodName": "CBT方法名", "content": "方法说明" },
  "suggestions": ["建议1", "建议2"],
  "sourcesNote": "来源说明"
}
不要输出 JSON 之外的文字，不要用 markdown 代码块包裹。`
}

export function buildAnalysisUserPrompt(params: {
  ocrText?: string
  manualText?: string
  userFeelingText?: string
  anxietyScore?: number
  sourcePlatform?: string
  knowledgeContext?: string
  historyContext?: string
}): string {
  const parts: string[] = ['请分析这张社交媒体截图。']

  if (params.ocrText) parts.push(`\n## OCR 识别文字\n${params.ocrText}`)
  if (params.manualText) parts.push(`\n## 用户补充说明\n${params.manualText}`)
  if (params.userFeelingText) parts.push(`\n## 用户感受\n${params.userFeelingText}`)
  if (params.anxietyScore != null) parts.push(`\n## 焦虑强度（0-10）\n${params.anxietyScore}/10`)
  if (params.sourcePlatform) parts.push(`\n## 截图来源平台\n${params.sourcePlatform}`)
  if (params.knowledgeContext) parts.push(`\n## 参考知识\n${params.knowledgeContext}`)
  if (params.historyContext) parts.push(`\n## 用户历史分析摘要\n${params.historyContext}`)

  return parts.join('\n')
}
