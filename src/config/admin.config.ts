export const adminConfig = {
  /** 管理员邮箱（用于初始管理员指定） */
  adminEmail: process.env.ADMIN_EMAIL || '',

  /** 管理员角色 */
  roles: {
    SUPER_ADMIN: 'super_admin',
    ADMIN: 'admin',
  } as const,

  /** 百宝箱首页推荐最大数量 */
  knowledgeHomeRecommendMax: 5,

  /** 免责声明核心条款（不可删除） */
  disclaimerCoreTerms: [
    '不替代专业医疗',
    '不替代心理咨询',
    '不替代心理治疗',
    '不提供医学诊断',
    '严重风险时寻求专业帮助',
  ] as const,
} as const
