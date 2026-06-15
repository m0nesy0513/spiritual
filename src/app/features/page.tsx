import { MobileLayout } from '@/components/layout'

export default function FeaturesPage() {
  return (
    <MobileLayout>
      <div className="px-6 pt-8 pb-24">
        <h1 className="text-xl font-bold text-gray-800 mb-6">功能入口</h1>
        <div className="grid grid-cols-2 gap-4">
          <FeatureCard title="📝 个人笔记" desc="记录你的反焦虑思考" href="/notes" />
          <FeatureCard title="💬 用户反馈" desc="提交建议或问题" href="/suggestions" />
          <FeatureCard title="🧘 情绪疏导室" desc="Coming Soon" href="/coming-soon" />
          <FeatureCard title="📊 长期复盘" desc="Coming Soon" href="/coming-soon" />
          <FeatureCard title="🏆 成就墙" desc="Coming Soon" href="/coming-soon" />
          <FeatureCard title="📁 焦虑档案" desc="Coming Soon" href="/coming-soon" />
        </div>
      </div>
    </MobileLayout>
  )
}

function FeatureCard({ title, desc, href }: { title: string; desc: string; href: string }) {
  return (
    <a href={href} className="card hover:shadow-md transition text-center space-y-1">
      <div className="text-2xl">{title.charAt(0) === '📝' ? '📝' : title.charAt(0) === '💬' ? '💬' : title.charAt(2)}</div>
      <div className="font-medium text-sm text-gray-700">{title.replace(/^.\s/, '')}</div>
      <div className="text-xs text-gray-400">{desc}</div>
    </a>
  )
}
