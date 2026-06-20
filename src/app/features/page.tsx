import { MobileLayout } from '@/components/layout'
import { COMING_SOON_FEATURES } from '@/config/features'

interface FeatureCardData {
  icon: string
  title: string
  desc: string
  href: string
}

function buildCards(): FeatureCardData[] {
  const cards: FeatureCardData[] = [
    { icon: '📝', title: '个人笔记', desc: '记录你的反焦虑思考', href: '/notes' },
    { icon: '💬', title: '用户反馈', desc: '提交建议或问题', href: '/suggestions' },
    // 情绪疏导室 — 纯粹占位，不做独立页面
    { icon: '🧘', title: '情绪疏导室', desc: 'Coming Soon', href: '/coming-soon' },
  ]

  // Coming-soon cards with specific metadata
  const comingSoonCards: FeatureCardData[] = [
    { key: 'long_term_review' },
    { key: 'achievement_wall' },
    { key: 'anxiety_archive' },
  ].map(({ key }) => {
    const f = COMING_SOON_FEATURES[key]
    return {
      icon: f.icon,
      title: f.title,
      desc: 'Coming Soon',
      href: `/coming-soon?feature=${key}`,
    }
  })

  cards.push(...comingSoonCards)
  return cards
}

export default function FeaturesPage() {
  const cards = buildCards()

  return (
    <MobileLayout>
      <div className="px-6 pt-8 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-6">功能入口</h1>
        <div className="grid grid-cols-2 gap-4">
          {cards.map((card) => (
            <FeatureCard key={card.href} {...card} />
          ))}
        </div>
      </div>
    </MobileLayout>
  )
}

function FeatureCard({ icon, title, desc, href }: FeatureCardData) {
  return (
    <a href={href} className="card hover:shadow-md transition text-center space-y-1">
      <div className="text-2xl">{icon}</div>
      <div className="font-medium text-sm text-gray-700">{title}</div>
      <div className="text-xs text-gray-400">{desc}</div>
    </a>
  )
}
