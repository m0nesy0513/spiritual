// ============================================
// 反馈/提议相关类型
// ============================================

/** 用户提议类型 */
export type SuggestionType = 'feature_request' | 'bug_feedback' | 'content_correction' | 'experience_optimization' | 'other'

/** 用户提议处理状态 */
export type SuggestionStatus = 'pending' | 'processing' | 'adopted' | 'not_adopted' | 'completed'

/** 提交用户提议请求 */
export interface CreateSuggestionRequest {
  suggestionType: SuggestionType
  content: string
  contactText?: string
}

/** 管理员视图中的用户提议 */
export interface AdminSuggestion {
  id: string
  suggestionType: SuggestionType
  content: string
  contactText: string | null
  status: SuggestionStatus
  submitter: {
    type: 'registered_user' | 'deleted_user'
    displayName: string
  }
  createdAt: string
}
