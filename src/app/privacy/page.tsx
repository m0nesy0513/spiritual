export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        <a href="/register" className="text-amber-600 text-sm mb-4 inline-block">← 返回注册</a>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">隐私政策</h1>

        <div className="card space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>精神避难所（以下简称"我们"）重视用户隐私。本隐私政策说明我们如何收集、使用和保护用户信息。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">1. 信息收集</h2>
          <p>我们收集以下信息：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>注册信息：手机号或邮箱、用户名</li>
            <li>使用信息：上传的截图、填写的感受、AI 分析结果、反馈</li>
            <li>设备信息：浏览器类型、设备型号、操作系统版本</li>
          </ul>

          <h2 className="text-base font-semibold text-gray-700 mt-4">2. 信息使用</h2>
          <p>收集的信息用于：提供截图分析服务、改进产品质量、保障账号安全、遵守法律法规要求。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">3. 数据存储与安全</h2>
          <p>用户数据存储在位于中国大陆的服务器上，采用加密传输和存储。我们采取合理的安全措施保护用户数据。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">4. 数据共享</h2>
          <p>我们不会将用户私人数据（历史记录、截图、分析结果、个人笔记等）出售或共享给第三方。管理员无法查看用户私人分析内容。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">5. 数据删除</h2>
          <p>用户可以随时删除自己的历史记录和个人笔记。注销账号后，所有私人数据将被物理删除，不可恢复。用户主动提交给管理员的反馈和提议在注销后将匿名化处理。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">6. Cookie 使用</h2>
          <p>我们使用必要的 Cookie 维持登录状态。不用于跟踪用户行为或投放广告。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">7. 政策更新</h2>
          <p>我们可能适时更新本政策，更新后将通过产品内通知告知用户。</p>

          <p className="text-gray-400 mt-6">更新日期：2026年6月</p>
        </div>
      </div>
    </div>
  )
}
