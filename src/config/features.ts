/**
 * 功能入口元数据
 * 每个待上线功能在此定义其名称、图标、描述、开发状态
 */
export interface FeatureMeta {
  /** 功能 key，对应 URL ?feature=xxx */
  key: string
  /** 功能名称 */
  title: string
  /** 图标 emoji */
  icon: string
  /** Coming Soon 页面上的简述 */
  description: string
  /** 开发状态标签 */
  status: '规划中' | '开发中' | '内测中'
}

export const COMING_SOON_FEATURES: Record<string, FeatureMeta> = {
  emotion_room: {
    key: 'emotion_room',
    title: '情绪疏导室',
    icon: '🧘',
    description: '选择当下情绪，获得定制化的冥想引导、呼吸练习和舒缓音乐推荐，帮助你快速平复焦虑。',
    status: '规划中',
  },
  long_term_review: {
    key: 'long_term_review',
    title: '长期复盘',
    icon: '📊',
    description: '以周/月为单位回顾你的焦虑变化趋势、高频触发场景和应对效果，发现自己的成长轨迹。',
    status: '规划中',
  },
  achievement_wall: {
    key: 'achievement_wall',
    title: '成就墙',
    icon: '🏆',
    description: '记录你在应对焦虑过程中的每一个小里程碑——连续记录天数、完成疏导次数、解锁知识条目。',
    status: '规划中',
  },
  anxiety_archive: {
    key: 'anxiety_archive',
    title: '焦虑档案',
    icon: '📁',
    description: '将你的焦虑场景分门别类归档，形成专属的"焦虑图谱"，一眼看清哪些场景最常触发焦虑。',
    status: '规划中',
  },
}
