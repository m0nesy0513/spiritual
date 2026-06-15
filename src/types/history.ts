// ============================================
// 历史记录相关类型
// ============================================

/** 反馈评价选项 */
export type FeelingAfterOption = 'much_better' | 'better' | 'no_change' | 'worse'
export type UsefulnessOption = 'very_useful' | 'useful' | 'average' | 'not_useful'

/** 反馈请求 */
export interface FeedbackRequest {
  feelingAfterOption: FeelingAfterOption
  usefulnessOption: UsefulnessOption
  anxietyScoreAfter?: number
  followupText?: string
}

/** 反馈摘要 */
export interface FeedbackSummary {
  submitted: boolean
  feelingAfterOption?: FeelingAfterOption
  usefulnessOption?: UsefulnessOption
}

/** 反馈详情 */
export interface FeedbackDetail extends FeedbackSummary {
  anxietyScoreBefore?: number
  anxietyScoreAfter?: number
  followupText?: string
  submittedAt?: string
}

/** 历史列表项 */
export interface HistoryListItem {
  recordId: string
  createdAt: string
  thumbnailUrl: string | null
  thumbnailPlaceholder: boolean
  primaryPersonaType: string
  primaryAnxietyType: string
  oneSentenceSummary: string
  keywords: string[]
  feedbackSummary: FeedbackSummary
  customTags: string[]
}

/** 历史详情 */
export interface HistoryDetail {
  recordId: string
  createdAt: string
  analysis: Record<string, unknown>
  feedback: FeedbackDetail
  note: { noteText: string }
  customTags: string[]
  sourceSnapshots: unknown[]
  disclaimerSnapshot: { text: string }
  risk: {
    isHighRisk: boolean
    riskStatus: string
    triggerReasonSummary: string | null
  }
}

/** 历史列表查询参数 */
export interface HistoryQueryParams {
  page?: number
  pageSize?: number
  search?: string
  timeRange?: 'today' | 'this_week' | 'this_month' | 'custom'
  startDate?: string
  endDate?: string
  anxietyType?: string
  personaType?: string
  tags?: string[]
  groupBy?: 'time' | 'persona'
}

/** 历史自定义标签更新 */
export interface UpdateHistoryTagsRequest {
  tags: string[]
}

/** 历史备注更新 */
export interface UpdateHistoryNoteRequest {
  noteText: string
}
