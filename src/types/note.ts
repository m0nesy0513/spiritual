// ============================================
// 个人笔记相关类型
// ============================================

/** 笔记关联来源类型 */
export type SourceRelationTargetType = 'history' | 'knowledge'

/** 笔记关联来源 */
export interface SourceRelation {
  targetType: SourceRelationTargetType
  targetId: string
  titleSnapshot: string
  deleted?: boolean
}

/** 笔记列表项 */
export interface NoteListItem {
  noteId: string
  title: string
  bodyPreview: string
  tags: string[]
  sourceRelations: SourceRelation[]
  createdAt: string
  updatedAt: string
}

/** 笔记详情 */
export interface NoteDetail {
  noteId: string
  title: string
  body: string
  tags: string[]
  sourceRelations: SourceRelation[]
  createdAt: string
  updatedAt: string
}

/** 创建笔记请求 */
export interface CreateNoteRequest {
  title: string
  body: string
  tags?: string[]
  sourceRelations?: {
    targetType: SourceRelationTargetType
    targetId: string
  }[]
}

/** 更新笔记请求 */
export interface UpdateNoteRequest {
  title?: string
  body?: string
  tags?: string[]
  sourceRelations?: {
    targetType: SourceRelationTargetType
    targetId: string
  }[]
}

/** 关联来源搜索结果 */
export interface SourceSearchResult {
  history: {
    targetType: 'history'
    targetId: string
    title: string
    createdAt: string
  }[]
  knowledge: {
    targetType: 'knowledge'
    targetId: string
    title: string
    categoryName: string
  }[]
}
