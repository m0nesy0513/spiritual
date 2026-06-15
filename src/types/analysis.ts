// ============================================
// AI 分析相关类型
// ============================================

/** 截图来源平台 */
export type SourcePlatform = 'wechat_moments' | 'xiaohongshu' | 'weibo' | 'douyin' | 'bilibili' | 'other'

/** 分析请求 */
export interface AnalysisRequest {
  screenshotFileId: string
  userFeelingText?: string
  manualText?: string
  anxietyScoreBefore?: number
  sourcePlatform?: SourcePlatform
  referenceHistoryEnabled?: boolean
  saveOriginalScreenshot?: boolean
  saveFullRecognizedText?: boolean
}

/** AI 分析结果（11 个 AI 生成模块） */
export interface AnalysisModules {
  oneSentenceSummary: string
  keywords: string[]
  screenshotSummary: string
  personaTypes: {
    primary: string
    all: string[]
  }
  anxietyTypes: {
    primary: string
    all: string[]
  }
  packagingAnalysis: string
  comparisonTrapAnalysis: string
  whyYouFeelAnxious: string
  cbtAssistance: {
    methodName: string
    content: string
  }
  suggestions: string[]
  sources: AnalysisSource[]
}

/** 来源 / 参考依据 */
export interface AnalysisSource {
  knowledgeId: string
  title: string
  categoryName: string
  summary: string
  reason: string
}

/** 百宝箱推荐卡片 */
export interface KnowledgeRecommendation {
  id: string
  title: string
  categoryName: string
  summary: string
}

/** 高风险状态 */
export type RiskStatus = 'none' | 'pending' | 'handled'

/** 分析完整响应 */
export interface AnalysisResponse {
  recordId: string
  createdAt: string
  resultPageUrl: string
  riskStatus: RiskStatus
}

/** 分析结果详情（GET /api/analysis/:recordId） */
export interface AnalysisDetailResponse {
  recordId: string
  createdAt: string
  input: {
    userFeelingText: string | null
    anxietyScoreBefore: number | null
    sourcePlatform: string | null
    referenceHistoryEnabled: boolean
    hasOriginalScreenshot: boolean
    hasFullRecognizedText: boolean
    screenshotPreviewUrl: string | null
  }
  modules: AnalysisModules & {
    knowledgeRecommendations: KnowledgeRecommendation[]
    disclaimer: {
      text: string
      snapshotVersion: string
    }
  }
  risk: {
    isHighRisk: boolean
    riskStatus: RiskStatus
    triggerReasonSummary: string | null
  }
  feedback: {
    submitted: boolean
  }
  note: {
    noteText: string
  }
  customTags: string[]
}

/** 重新分析模式 */
export type ReanalyzeMode = 'overwrite_current' | 'create_new'

/** 重新分析请求 */
export interface ReanalyzeRequest {
  mode: ReanalyzeMode
  saveOriginalScreenshot?: boolean
  saveFullRecognizedText?: boolean
}

/** 重新分析响应 */
export interface ReanalyzeResponse {
  recordId: string
  sourceRecordId?: string
  resultPageUrl: string
  createdNewRecord: boolean
  riskStatus: RiskStatus
}
