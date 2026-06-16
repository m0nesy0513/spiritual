'use client'

import { useRouter } from 'next/navigation'

export default function TermsPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        <button onClick={() => router.back()} className="text-amber-600 text-sm mb-4 inline-block">← 返回</button>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">用户协议</h1>

        <div className="card space-y-4 text-sm text-gray-600 leading-relaxed">
          <p>欢迎使用精神避难所（以下简称"本产品"）。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">1. 服务说明</h2>
          <p>本产品是一个社交媒体焦虑分析工具，旨在帮助用户认识和理解社交媒体引发的焦虑情绪，提供心理学知识和方法参考。本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">2. 用户注册</h2>
          <p>用户注册时需提供真实有效的手机号或邮箱。用户应对其账号的安全性负责，不得将账号出借或转让给他人使用。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">3. 用户行为规范</h2>
          <p>用户不得利用本产品从事任何违法违规活动，包括但不限于：上传违法违规内容、侵犯他人隐私或知识产权、干扰产品正常运行等。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">4. 隐私保护</h2>
          <p>我们重视用户隐私。用户的分析记录、截图、感受等私人数据仅用户本人可访问，管理员无法查看用户私人内容。详见隐私政策。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">5. 免责声明</h2>
          <p>本产品不提供医疗诊断、心理咨询、心理治疗或危机干预。如遇严重心理困扰，请寻求专业帮助。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">6. 协议修改</h2>
          <p>我们可能适时更新本协议，更新后将通过产品内通知或邮件告知用户。继续使用即视为同意更新后的协议。</p>

          <p className="text-gray-400 mt-6">更新日期：2026年6月</p>
        </div>
      </div>
    </div>
  )
}
