export default function ComingSoon() {
  return (
    <div className="min-h-screen bg-amber-50 flex flex-col items-center justify-center p-6">
      <span className="text-5xl mb-4">🚧</span>
      <h1 className="text-xl font-bold text-gray-700 mb-2">功能正在准备中</h1>
      <p className="text-gray-400 text-sm text-center mb-6">这个功能还在内测中继续优化</p>
      <a href="/home" className="btn-primary">返回首页</a>
    </div>
  )
}
