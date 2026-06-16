import { query, execute, transaction } from '@/lib/db'
import { chatCompletion, imageToDataUrl, buildAnalysisUserPrompt, buildAnalysisSystemPrompt } from '@/lib/ai'
import { readFile } from '@/lib/storage'
import { recognizeImageText } from '@/lib/ocr'
import { KnowledgeService } from './knowledge.service'
import { ValidationError, ForbiddenError, AIAnalysisError } from '@/lib/errors'
import type { PoolConnection } from 'mysql2/promise'
import crypto from 'crypto'

// ============================================
// 分析结果类型（11 个 AI 模块）
// ============================================
export interface AIAnalysisOutput {
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
  sourcesNote: string // AI 对来源的说明
}

// ============================================
// 分析编排主入口
// ============================================
export async function createAnalysis(params: {
  userId: number
  screenshotFileId: string
  userFeelingText?: string
  manualText?: string
  anxietyScoreBefore?: number
  sourcePlatform?: string
  referenceHistoryEnabled?: boolean
  saveOriginalScreenshot?: boolean
  saveFullRecognizedText?: boolean
}) {
  const {
    userId, screenshotFileId, userFeelingText, manualText,
    anxietyScoreBefore, sourcePlatform, referenceHistoryEnabled,
    saveOriginalScreenshot, saveFullRecognizedText,
  } = params

  // 1. 校验文件归属
  const fileRows = await query<any>(
    'SELECT * FROM file_assets WHERE id = ? AND owner_user_id = ? LIMIT 1',
    [screenshotFileId, userId],
  )
  if (fileRows.length === 0) throw new ForbiddenError('文件不存在或无权访问')
  const file = fileRows[0]

  // 2. OCR 文字识别
  let ocrText = ''
  try {
    const buffer = readFile(file.storage_path)
    const ocrResult = await recognizeImageText(buffer, file.mime_type)
    ocrText = ocrResult.text
  } catch { /* OCR 失败不阻断流程 */ }

  // 3. 提取关键词用于知识匹配
  const ocrKeywords = extractKeywords(ocrText)
  const feelKeywords = userFeelingText ? extractKeywords(userFeelingText) : []

  // 4. 知识库匹配
  const matchedKnowledge = await KnowledgeService.matchKnowledge({
    ocrKeywords: [...ocrKeywords, ...feelKeywords],
    userFeelingText,
    sourcePlatform,
  })
  const matchedCount = matchedKnowledge.length // 0 时特殊处理

  // 5. 读取历史摘要（如果用户开启）
  let historyContext = ''
  if (referenceHistoryEnabled) {
    const histRows = await query<any>(
      `SELECT one_sentence_summary, persona_types, anxiety_types, keywords, feedback_summary
       FROM analysis_history_summaries WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
      [userId],
    )
    if (histRows.length > 0) {
      historyContext = histRows.map((h: any, i: number) =>
        `[历史${i + 1}] 摘要：${h.one_sentence_summary || '无'} | 人设：${JSON.stringify(h.persona_types)} | 焦虑：${JSON.stringify(h.anxiety_types)} | 关键词：${h.keywords} | 反馈：${h.feedback_summary || '未反馈'}`
      ).join('\n')
    }
  }

  // 6. 构建 AI Prompt
  const systemPrompt = buildAnalysisSystemPrompt()
  const knowledgeContext = KnowledgeService.buildContextText(matchedKnowledge)
  const userPromptText = buildAnalysisUserPrompt({
    ocrText: ocrText || undefined,
    manualText: manualText || undefined,
    userFeelingText: userFeelingText || undefined,
    anxietyScore: anxietyScoreBefore,
    sourcePlatform: sourcePlatform || undefined,
    knowledgeContext: knowledgeContext || undefined,
    historyContext: historyContext || undefined,
  })

  // 7. 调用 AI（多模态：图片 + 文字）
  let aiResult: AIAnalysisOutput
  try {
    const imageBuffer = readFile(file.storage_path)
    const dataUrl = imageToDataUrl(imageBuffer, file.mime_type)

    // 构建附带图片信息的 user prompt
    const imageContext = [
      ocrText ? `[OCR 文字：${ocrText.substring(0, 500)}]` : '',
      manualText ? `[用户补充：${manualText}]` : '',
    ].filter(Boolean).join('\n')

    const response = await chatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: dataUrl } },
            { type: 'text', text: userPromptText + (imageContext ? '\n\n' + imageContext : '') },
          ],
        },
      ],
    })

    aiResult = parseAIResponse(response.content)
  } catch (err) {
    throw new AIAnalysisError(
      err instanceof Error ? err.message : 'AI 分析失败，请稍后重试',
      true,
    )
  }

  // 8. 高风险识别
  const riskCheck = assessRisk(aiResult, anxietyScoreBefore, userFeelingText)

  // 9. 生成来源快照 / 推荐
  const sources = KnowledgeService.generateSources(matchedKnowledge)
  const recommendations = await KnowledgeService.generateRecommendations(matchedKnowledge)

  // 10. 获取免责声明
  const disclaimerRows = await query<any>(
    "SELECT body FROM admin_contents WHERE content_type = 'disclaimer' AND is_enabled = TRUE LIMIT 1",
  )
  const disclaimerText = disclaimerRows[0]?.body || '本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。'

  // 11. 保存所有数据（事务）
  const recordPublicId = crypto.randomBytes(12).toString('hex')

  const result = await transaction(async (conn: PoolConnection) => {
    // 创建历史主记录
    const [record] = await conn.execute(
      `INSERT INTO analysis_records
        (user_id, record_public_id, parent_record_id, user_feeling_text, anxiety_score_before,
         source_platform, reference_history_enabled, manual_text,
         save_original_screenshot, save_full_recognized_text, screenshot_file_id, status)
       VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'completed')`,
      [
        userId, recordPublicId, userFeelingText || null, anxietyScoreBefore || null,
        sourcePlatform || null, referenceHistoryEnabled ? 1 : 0, manualText || null,
        saveOriginalScreenshot ? 1 : 0, saveFullRecognizedText ? 1 : 0,
        saveOriginalScreenshot ? screenshotFileId : null,
      ],
    ) as any[]
    const recordId = record.insertId

    // 保存 OCR 文本（仅当用户勾选）
    if (saveFullRecognizedText && ocrText) {
      await conn.execute(
        'UPDATE analysis_records SET ocr_full_text = ? WHERE id = ?',
        [ocrText, recordId],
      )
    }

    // 保存分析结果
    await conn.execute(
      `INSERT INTO analysis_results
        (record_id, one_sentence_summary, screenshot_summary, packaging_analysis,
         comparison_trap_analysis, why_you_feel_anxious, cbt_method_name, cbt_content, suggestions)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, aiResult.oneSentenceSummary, aiResult.screenshotSummary,
        aiResult.packagingAnalysis, aiResult.comparisonTrapAnalysis,
        aiResult.whyYouFeelAnxious, aiResult.cbtAssistance.methodName,
        aiResult.cbtAssistance.content, JSON.stringify(aiResult.suggestions),
      ],
    )

    // 保存关键词
    for (let i = 0; i < aiResult.keywords.length; i++) {
      await conn.execute(
        'INSERT INTO analysis_keywords (record_id, keyword, sort_order) VALUES (?, ?, ?)',
        [recordId, aiResult.keywords[i], i],
      )
    }

    // 保存人设标签
    const allPersona = [aiResult.personaTypes.primary, ...aiResult.personaTypes.all.filter(t => t !== aiResult.personaTypes.primary)]
    for (let i = 0; i < allPersona.length; i++) {
      await conn.execute(
        'INSERT INTO analysis_persona_tags (record_id, tag_name, is_primary, sort_order) VALUES (?, ?, ?, ?)',
        [recordId, allPersona[i], i === 0 ? 1 : 0, i],
      )
    }

    // 保存焦虑类型标签
    const allAnxiety = [aiResult.anxietyTypes.primary, ...aiResult.anxietyTypes.all.filter(t => t !== aiResult.anxietyTypes.primary)]
    for (let i = 0; i < allAnxiety.length; i++) {
      await conn.execute(
        'INSERT INTO analysis_anxiety_tags (record_id, tag_name, is_primary, sort_order) VALUES (?, ?, ?, ?)',
        [recordId, allAnxiety[i], i === 0 ? 1 : 0, i],
      )
    }

    // 保存来源快照
    for (let i = 0; i < sources.length; i++) {
      const s = sources[i]
      await conn.execute(
        `INSERT INTO analysis_sources_snapshot (record_id, knowledge_item_id, title_snapshot, category_name_snapshot, summary_snapshot, reason_snapshot, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [recordId, s.knowledgeId, s.title, s.categoryName, s.summary, s.reason, i],
      )
    }

    // 保存 0 匹配特殊提示
    if (matchedCount === 0) {
      await conn.execute(
        `INSERT INTO analysis_sources_snapshot (record_id, knowledge_item_id, title_snapshot, summary_snapshot, reason_snapshot, sort_order)
         VALUES (?, NULL, '本次分析未匹配到特定知识条目', '本次分析未匹配到特定知识条目，基于通用知识生成', '本次分析未匹配到特定知识条目，基于通用知识生成', 0)`,
        [recordId],
      )
    }

    // 保存免责声明快照
    await conn.execute(
      'INSERT INTO analysis_disclaimer_snapshots (record_id, disclaimer_text) VALUES (?, ?)',
      [recordId, disclaimerText],
    )

    // 保存高风险状态
    await conn.execute(
      `INSERT INTO analysis_risk_states (record_id, is_high_risk, risk_status, trigger_reason_summary)
       VALUES (?, ?, ?, ?)`,
      [recordId, riskCheck.isHighRisk ? 1 : 0, riskCheck.isHighRisk ? 'pending' : 'none', riskCheck.reason],
    )

    // 保存历史摘要
    const feedbackSummary = ''
    await conn.execute(
      `INSERT INTO analysis_history_summaries
        (record_id, user_id, one_sentence_summary, persona_types, anxiety_types, keywords, feedback_summary)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        recordId, userId, aiResult.oneSentenceSummary,
        JSON.stringify([aiResult.personaTypes.primary, ...allPersona.slice(1)]),
        JSON.stringify([aiResult.anxietyTypes.primary, ...allAnxiety.slice(1)]),
        JSON.stringify(aiResult.keywords), feedbackSummary,
      ],
    )

    return { recordId, recordPublicId }
  })

  return {
    recordId: result.recordPublicId,
    resultPageUrl: `/analysis/${result.recordPublicId}`,
    riskStatus: riskCheck.isHighRisk ? 'pending' : 'none',
    matchedCount,
  }
}

// ============================================
// 获取分析结果（用于结果页 + 历史详情恢复）
// ============================================
export async function getAnalysis(userId: number, recordPublicId: string) {
  const records = await query<any>(
    'SELECT * FROM analysis_records WHERE record_public_id = ? AND user_id = ? LIMIT 1',
    [recordPublicId, userId],
  )
  if (records.length === 0) throw new ForbiddenError('记录不存在或无权访问')
  const rec = records[0]

  // 并行加载所有子数据
  const [
    results, keywords, personaTags, anxietyTags,
    sources, disclaimer, riskRows, feedback, summaries, tags, notes,
  ] = await Promise.all([
    query<any>('SELECT * FROM analysis_results WHERE record_id = ? LIMIT 1', [rec.id]),
    query<any>('SELECT keyword FROM analysis_keywords WHERE record_id = ? ORDER BY sort_order', [rec.id]),
    query<any>('SELECT tag_name, is_primary FROM analysis_persona_tags WHERE record_id = ? ORDER BY sort_order', [rec.id]),
    query<any>('SELECT tag_name, is_primary FROM analysis_anxiety_tags WHERE record_id = ? ORDER BY sort_order', [rec.id]),
    query<any>('SELECT * FROM analysis_sources_snapshot WHERE record_id = ? ORDER BY sort_order', [rec.id]),
    query<any>('SELECT disclaimer_text FROM analysis_disclaimer_snapshots WHERE record_id = ? LIMIT 1', [rec.id]),
    query<any>('SELECT * FROM analysis_risk_states WHERE record_id = ? LIMIT 1', [rec.id]),
    query<any>('SELECT * FROM analysis_feedbacks WHERE record_id = ? LIMIT 1', [rec.id]),
    query<any>('SELECT one_sentence_summary, persona_types, anxiety_types, keywords, feedback_summary FROM analysis_history_summaries WHERE record_id = ? LIMIT 1', [rec.id]),
    query<any>(
      `SELECT rct.tag_name FROM record_custom_tag_relations rctr
       JOIN record_custom_tags rct ON rct.id = rctr.tag_id
       WHERE rctr.record_id = ?`, [rec.id],
    ),
    query<any>(`SELECT n.body FROM notes n
       JOIN note_source_relations nsr ON nsr.note_id = n.id
       WHERE nsr.source_type = 'history' AND nsr.source_id = ? AND n.user_id = ? LIMIT 1`, [rec.id, userId]),
  ])

  const result = results[0]
  const riskData = riskRows[0]

  const allPersona = personaTags.map((p: any) => p.tag_name)
  const primaryPersona = personaTags.find((p: any) => p.is_primary)?.tag_name || allPersona[0] || ''
  const personaRest = allPersona.filter((t: string) => t !== primaryPersona)

  const allAnxiety = anxietyTags.map((a: any) => a.tag_name)
  const primaryAnxiety = anxietyTags.find((a: any) => a.is_primary)?.tag_name || allAnxiety[0] || ''
  const anxietyRest = allAnxiety.filter((t: string) => t !== primaryAnxiety)

  return {
    recordId: recordPublicId,
    createdAt: rec.created_at,
    input: {
      userFeelingText: rec.user_feeling_text,
      anxietyScoreBefore: rec.anxiety_score_before,
      sourcePlatform: rec.source_platform,
      referenceHistoryEnabled: !!rec.reference_history_enabled,
      hasOriginalScreenshot: !!rec.screenshot_file_id,
      hasFullRecognizedText: !!(rec.save_full_recognized_text && rec.ocr_full_text),
      screenshotPreviewUrl: rec.screenshot_file_id ? `/api/files/${rec.screenshot_file_id}` : null,
    },
    modules: {
      oneSentenceSummary: result?.one_sentence_summary || '当前信息不足，无法判断',
      keywords: keywords.map((k: any) => k.keyword),
      screenshotSummary: result?.screenshot_summary || '当前信息不足，无法判断',
      personaTypes: {
        primary: primaryPersona || '当前信息不足，无法明确识别人设类型',
        all: personaRest,
      },
      anxietyTypes: {
        primary: primaryAnxiety || '当前信息不足，无法判断',
        all: anxietyRest,
      },
      packagingAnalysis: result?.packaging_analysis || '当前信息不足，无法判断',
      comparisonTrapAnalysis: result?.comparison_trap_analysis || '当前信息不足，无法判断',
      whyYouFeelAnxious: result?.why_you_feel_anxious || '当前信息不足，无法判断',
      cbtAssistance: {
        methodName: result?.cbt_method_name || '通用认知调整',
        content: result?.cbt_content || '当前信息不足，无法判断',
      },
      suggestions: result?.suggestions ? JSON.parse(result.suggestions) : ['当前信息不足，无法提供具体建议'],
      knowledgeRecommendations: [],
      sources: sources.map((s: any) => ({
        knowledgeId: s.knowledge_item_id ? String(s.knowledge_item_id) : '',
        title: s.title_snapshot,
        categoryName: s.category_name_snapshot || '',
        summary: s.summary_snapshot || '',
        reason: s.reason_snapshot || '',
      })),
      disclaimer: {
        text: disclaimer[0]?.disclaimer_text || '',
      },
    },
    risk: {
      isHighRisk: !!riskData?.is_high_risk,
      riskStatus: riskData?.risk_status || 'none',
      triggerReasonSummary: riskData?.trigger_reason_summary || null,
    },
    feedback: {
      submitted: !!feedback[0],
    },
    note: {
      noteText: notes[0]?.body || '',
    },
    customTags: tags.map((t: any) => t.tag_name),
  }
}

// ============================================
// 重新分析
// ============================================
export async function reanalyze(params: {
  userId: number
  recordPublicId: string
  mode: 'overwrite_current' | 'create_new'
  saveOriginalScreenshot?: boolean
  saveFullRecognizedText?: boolean
}) {
  const { userId, recordPublicId, mode } = params

  // 获取旧记录
  const oldRecs = await query<any>(
    'SELECT * FROM analysis_records WHERE record_public_id = ? AND user_id = ? LIMIT 1',
    [recordPublicId, userId],
  )
  if (oldRecs.length === 0) throw new ForbiddenError('记录不存在')
  const oldRec = oldRecs[0]

  // 检查是否已提交反馈（已反馈的不能覆盖）
  const feedbackExist = await query<any>(
    'SELECT id FROM analysis_feedbacks WHERE record_id = ? LIMIT 1',
    [oldRec.id],
  )

  const shouldCreateNew = mode === 'create_new' || feedbackExist.length > 0

  if (shouldCreateNew) {
    // 生成新记录
    const result = await createAnalysis({
      userId,
      screenshotFileId: oldRec.screenshot_file_id
        ? String(oldRec.screenshot_file_id)
        : '',
      userFeelingText: oldRec.user_feeling_text,
      anxietyScoreBefore: oldRec.anxiety_score_before,
      sourcePlatform: oldRec.source_platform,
      referenceHistoryEnabled: !!oldRec.reference_history_enabled,
      saveOriginalScreenshot: params.saveOriginalScreenshot ?? false,
      saveFullRecognizedText: params.saveFullRecognizedText ?? false,
    })

    // 更新 parent_record_id
    await execute(
      'UPDATE analysis_records SET parent_record_id = ? WHERE record_public_id = ?',
      [oldRec.id, result.recordId],
    )

    return {
      recordId: result.recordId,
      sourceRecordId: recordPublicId,
      resultPageUrl: `/analysis/${result.recordId}`,
      createdNewRecord: true,
      riskStatus: result.riskStatus,
    }
  } else {
    // 覆盖当前记录：删除旧子数据，重新分析，写回原 record_id
    await transaction(async (conn: PoolConnection) => {
      await conn.execute('DELETE FROM analysis_results WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_keywords WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_persona_tags WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_anxiety_tags WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_sources_snapshot WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_disclaimer_snapshots WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_risk_states WHERE record_id = ?', [oldRec.id])
      await conn.execute('DELETE FROM analysis_history_summaries WHERE record_id = ?', [oldRec.id])
    })

    // 重新分析（需要用正确的方式写入旧的 record.id 和 record_public_id）
    // 这里简化处理：删除旧记录，生成新记录（因为 createAnalysis 会生成新的 public_id）
    await execute('DELETE FROM analysis_records WHERE id = ?', [oldRec.id])

    const result = await createAnalysis({
      userId,
      screenshotFileId: oldRec.screenshot_file_id ? String(oldRec.screenshot_file_id) : '',
      userFeelingText: oldRec.user_feeling_text,
      anxietyScoreBefore: oldRec.anxiety_score_before,
      sourcePlatform: oldRec.source_platform,
      referenceHistoryEnabled: !!oldRec.reference_history_enabled,
      saveOriginalScreenshot: oldRec.save_original_screenshot ? true : false,
      saveFullRecognizedText: oldRec.save_full_recognized_text ? true : false,
    })

    return {
      recordId: result.recordId,
      resultPageUrl: `/analysis/${result.recordId}`,
      createdNewRecord: false,
      riskStatus: result.riskStatus,
    }
  }
}

// ============================================
// 辅助函数
// ============================================

function extractKeywords(text: string): string[] {
  // 简单按字符长度提取，过滤纯数字和短词
  const cleaned = text.replace(/[，,。！？\s\n]+/g, ' ').trim()
  const words = cleaned.split(' ').filter(w => w.length >= 2 && !/^\d+$/.test(w))
  return [...new Set(words)].slice(0, 20)
}


function parseAIResponse(content: string): AIAnalysisOutput {
  let text = content.trim()

  // 去掉可能的 markdown 代码块
  if (text.startsWith('```')) {
    const endIdx = text.lastIndexOf('```')
    text = text.substring(text.indexOf('\n') + 1, endIdx > 0 ? endIdx : text.length).trim()
  }

  // 尝试找到 JSON 对象
  const braceStart = text.indexOf('{')
  const braceEnd = text.lastIndexOf('}')
  if (braceStart >= 0 && braceEnd > braceStart) {
    text = text.substring(braceStart, braceEnd + 1)
  }

  const parsed = JSON.parse(text)

  return {
    oneSentenceSummary: String(parsed.oneSentenceSummary || '').slice(0, 30),
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.slice(0, 8).map(String) : [],
    screenshotSummary: String(parsed.screenshotSummary || '').slice(0, 100),
    personaTypes: {
      primary: String(parsed.personaTypes?.primary || '无法判定'),
      all: Array.isArray(parsed.personaTypes?.all) ? parsed.personaTypes.all.map(String) : [],
    },
    anxietyTypes: {
      primary: String(parsed.anxietyTypes?.primary || '无法判定'),
      all: Array.isArray(parsed.anxietyTypes?.all) ? parsed.anxietyTypes.all.map(String) : [],
    },
    packagingAnalysis: String(parsed.packagingAnalysis || '当前信息不足，无法判断'),
    comparisonTrapAnalysis: String(parsed.comparisonTrapAnalysis || '当前信息不足，无法判断'),
    whyYouFeelAnxious: String(parsed.whyYouFeelAnxious || '当前信息不足，无法判断'),
    cbtAssistance: {
      methodName: String(parsed.cbtAssistance?.methodName || '通用认知调整'),
      content: String(parsed.cbtAssistance?.content || '当前信息不足，无法判断'),
    },
    suggestions: Array.isArray(parsed.suggestions)
      ? parsed.suggestions.slice(0, 5).map(String).filter((s: string) => s.length <= 100)
      : [],
    sourcesNote: String(parsed.sourcesNote || ''),
  }
}

function assessRisk(
  ai: AIAnalysisOutput,
  anxietyScore?: number,
  feelingText?: string,
): { isHighRisk: boolean; reason: string | null } {
  const highRiskPatterns = [
    '自伤', '自杀', '伤害自己', '不想活', '想消失', '想死',
    '结束生命', '离开世界', '永远消失', '活不下去',
  ]

  const allText = [
    ai.oneSentenceSummary, ai.screenshotSummary,
    ai.packagingAnalysis, ai.whyYouFeelAnxious,
    ai.comparisonTrapAnalysis, ...ai.suggestions,
    feelingText || '',
  ].join(' ')

  const matched = highRiskPatterns.filter(p => allText.includes(p))

  if (matched.length > 0) {
    return { isHighRisk: true, reason: `检测到高风险信号：${matched.join('、')}` }
  }

  if (anxietyScore && anxietyScore >= 8 && matched.length > 0) {
    return { isHighRisk: true, reason: '焦虑强度极高且检测到危险表达' }
  }

  return { isHighRisk: false, reason: null }
}
