// ============================================
// 知识库 / 百宝箱相关类型
// ============================================

/** 知识分类 */
export interface KnowledgeCategory {
  id: string
  name: string
  sortOrder: number
  isEnabled: boolean
}

/** 知识条目列表项 */
export interface KnowledgeItem {
  id: string
  title: string
  category: {
    id: string
    name: string
  }
  tags: string[]
  summary: string
  body: string
  applicableScene: string | null
  sourceNote: string | null
  isEnabled: boolean
  isHomeRecommended: boolean
  updatedAt: string
}

/** 百宝箱列表项 */
export interface KnowledgeListItem {
  id: string
  title: string
  category: {
    id: string
    name: string
  }
  tags: string[]
  summary: string
  updatedAt: string
}

/** 创建/更新知识条目请求 */
export interface KnowledgeUpsertRequest {
  title: string
  categoryId: string
  tags?: string[]
  body: string
  applicableScene?: string
  sourceNote?: string
  isEnabled?: boolean
  isHomeRecommended?: boolean
}
