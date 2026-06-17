import { query } from '@/lib/db'

export interface KnowledgeMatchResult {
  id: number
  title: string
  categoryId: number
  categoryName: string
  body: string
  tags: string[]
  summary: string
  applicableScene: string | null
}

export interface KnowledgeSource {
  knowledgeId: number
  title: string
  categoryName: string
  summary: string
  reason: string
}

/**
 * 知识库匹配 + 相关推荐服务
 */
export const KnowledgeService = {
  /**
   * 根据 OCR 关键词 + 用户感受 + 平台，匹配已启用知识条目
   * 返回 5-8 条最相关的，不足 5 条时返回全部已匹配的
   */
  async matchKnowledge(params: {
    ocrKeywords: string[]
    userFeelingText?: string
    sourcePlatform?: string
  }): Promise<KnowledgeMatchResult[]> {
    const { ocrKeywords, userFeelingText } = params

    const allTerms = [...ocrKeywords]
    if (userFeelingText) {
      // 从感受中提取可能的关键词
      const words = userFeelingText.split(/[,，。！？\s]+/).filter(w => w.length >= 2)
      allTerms.push(...words)
    }

    if (allTerms.length === 0) {
      return []
    }

    // 构建 LIKE 条件匹配标题、正文、标签、适用场景
    const likeClauses = allTerms.map(() => '(ki.title LIKE ? OR ki.body LIKE ? OR kt.tag_name LIKE ? OR ki.applicable_scene LIKE ?)')
    const likeParams: unknown[] = []
    for (const term of allTerms) {
      const like = `%${term}%`
      likeParams.push(like, like, like, like)
    }

    const rows = await query<any>(
      `SELECT DISTINCT ki.id, ki.title, ki.category_id, kc.name as category_name,
              ki.body, ki.applicable_scene
       FROM knowledge_items ki
       LEFT JOIN knowledge_categories kc ON kc.id = ki.category_id
       LEFT JOIN knowledge_item_tags kit ON kit.knowledge_item_id = ki.id
       LEFT JOIN knowledge_tags kt ON kt.id = kit.knowledge_tag_id
       WHERE ki.is_enabled = TRUE AND ki.deleted_at IS NULL
         AND (${likeClauses.join(' OR ')})
       ORDER BY
         CASE WHEN ki.title LIKE ? THEN 0 ELSE 1 END,
         CASE WHEN ki.applicable_scene LIKE ? THEN 0 ELSE 1 END
       LIMIT 20`,
      [...likeParams, `%${allTerms[0]}%`, `%${allTerms[0]}%`],
    )

    if (rows.length === 0) return []

    // 取前 5-8 条
    const count = Math.min(rows.length, 8)
    const selected = rows.slice(0, count)

    // 加载标签
    const results: KnowledgeMatchResult[] = []
    for (const item of selected) {
      const tagRows = await query<any>(
        `SELECT kt.tag_name FROM knowledge_item_tags kit
         JOIN knowledge_tags kt ON kt.id = kit.knowledge_tag_id
         WHERE kit.knowledge_item_id = ?`,
        [item.id],
      )
      results.push({
        id: item.id,
        title: item.title,
        categoryId: item.category_id,
        categoryName: item.category_name,
        body: item.body,
        tags: tagRows.map((t: any) => t.tag_name),
        summary: item.applicable_scene || item.body.substring(0, 100) + '…',
        applicableScene: item.applicable_scene,
      })
    }

    return results
  },

  /**
   * 生成来源/参考依据快照
   */
  generateSources(matched: KnowledgeMatchResult[]): KnowledgeSource[] {
    return matched.map(m => ({
      knowledgeId: m.id,
      title: m.title,
      categoryName: m.categoryName,
      summary: m.summary,
      reason: m.applicableScene
        ? `因为本次分析涉及相关场景，与「${m.title}」的适用场景「${m.applicableScene}」相关。`
        : `因为本次分析涉及相关关键词，与「${m.title}」相关。`,
    }))
  },

  /**
   * 生成相关百宝箱推荐（0-3 条）
   */
  async generateRecommendations(matched: KnowledgeMatchResult[]): Promise<{
    id: string; title: string; categoryName: string; summary: string
  }[]> {
    if (matched.length === 0) return []

    // 优先取同分类中已启用但不在匹配列表中的条目
    const categoryIds = [...new Set(matched.map(m => m.categoryId))]
    const excludeIds = matched.map(m => m.id)

    const rows = await query<any>(
      `SELECT ki.id, ki.title, kc.name as category_name, ki.applicable_scene, ki.body
       FROM knowledge_items ki
       JOIN knowledge_categories kc ON kc.id = ki.category_id
       WHERE ki.is_enabled = TRUE AND ki.deleted_at IS NULL
         AND ki.category_id IN (${categoryIds.map(() => '?').join(',')})
         ${excludeIds.length > 0 ? `AND ki.id NOT IN (${excludeIds.map(() => '?').join(',')})` : ''}
       ORDER BY ki.updated_at DESC
       LIMIT 3`,
      [...categoryIds, ...excludeIds],
    )

    return rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      categoryName: r.category_name,
      summary: r.applicable_scene || (r.body as string).substring(0, 100) + '…',
    }))
  },

  /**
   * 获取用于注入 AI 上下文的知识内容文本
   */
  buildContextText(matched: KnowledgeMatchResult[]): string {
    if (matched.length === 0) return ''
    return matched.map((m, i) =>
      `[知识${i + 1}] 标题：${m.title}（分类：${m.categoryName}）\n内容：${m.body}`
    ).join('\n\n')
  },
}
