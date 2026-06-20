import { MobileLayout } from '@/components/layout'
import { appConfig } from '@/config/app.config'
import { COMING_SOON_FEATURES } from '@/config/features'

interface FeatureCardData {
  icon: string
  title: string
  desc: string
  href: string
}

/**
 * Live features — always available.
 * Coming-soon features run through COMING_SOON_FEATURES so each one gets
 * unique metadata (title / icon / desc / status) on the placeholder page.
 */
function buildCards(): FeatureCardData[] {
  const cards: FeatureCardData[] = [
    { icon: '📝', title: '个人笔记', desc: '记录你的反焦虑思考', href: '/notes' },
    { icon: '💬', title: '用户反馈', desc: '提交建议或问题', href: '/suggestions' },
  ]

  // Coming-soon cards — pass the feature key so /coming-soon can show specific info
  const comingSoonCards: FeatureCardData[] = [
    { key: 'emotion_room' },
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
