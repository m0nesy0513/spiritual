// ============================================
// 管理员后台相关类型
// ============================================

/** 系统文案类型 */
export type ContentType = 'disclaimer' | 'product_intro' | 'tutorial' | 'greeting' | 'coming_soon'

/** 系统文案 */
export interface AdminContent {
  contentType: ContentType
  title: string
  body: string
  isEnabled: boolean
  updatedAt: string
}

/** 更新系统文案请求 */
export interface UpdateContentRequest {
  title: string
  body: string
  isEnabled: boolean
}

/** 首页名言 */
export interface HomeQuote {
  id: string
  text: string
  author: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

/** 首页好歌 */
export interface HomeSong {
  id: string
  title: string
  artist: string
  reason: string
  suitableMood: string
  isEnabled: boolean
  createdAt: string
  updatedAt: string
}

/** 管理员角色 */
export type AdminRole = 'super_admin' | 'admin'
