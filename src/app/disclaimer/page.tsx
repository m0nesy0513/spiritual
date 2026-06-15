export default function DisclaimerPage() {
  return (
    <div className="min-h-screen bg-amber-50">
      <div className="max-w-lg mx-auto px-6 py-8">
        <a href="/register" className="text-amber-600 text-sm mb-4 inline-block">← 返回注册</a>
        <h1 className="text-2xl font-bold text-gray-800 mb-6">免责声明</h1>

        <div className="card space-y-4 text-sm text-gray-600 leading-relaxed">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700">
            <p className="font-semibold mb-2">重要提示</p>
            <p>本产品不能替代专业医疗、心理咨询、心理治疗或医学诊断。</p>
          </div>

          <h2 className="text-base font-semibold text-gray-700 mt-4">1. 产品定位</h2>
          <p>精神避难所是一个社交媒体焦虑分析工具，旨在帮助用户认识和理解社交媒体引发的焦虑情绪。它提供的分析、建议和知识内容仅供参考和教育目的。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">2. 不替代专业医疗</h2>
          <p>本产品不提供医疗诊断、处方、治疗或预后判断。如果您有身体或心理健康方面的担忧，请咨询合格的医疗专业人员。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">3. 不替代心理咨询</h2>
          <p>本产品的 AI 分析结果不是心理咨询或心理治疗。需要心理咨询服务请寻求持有执照的专业人士。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">4. 不提供危机干预</h2>
          <p>如果您正在经历强烈的痛苦、自伤或自杀念头，请立即联系：</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>当地医院急诊科</li>
            <li>全国心理援助热线：400-161-9995</li>
            <li>生命热线：400-821-1215</li>
            <li>身边可信任的亲友</li>
            <li>或拨打 110 / 120</li>
          </ul>

          <h2 className="text-base font-semibold text-gray-700 mt-4">5. AI 分析的限制</h2>
          <p>AI 分析基于已有的知识内容和算法模型，可能不准确、不完整或不适用于你的具体情况。分析结果不应作为重大人生决策的依据。</p>

          <h2 className="text-base font-semibold text-gray-700 mt-4">6. 用户责任</h2>
          <p>用户在使用本产品时应自行判断分析结果的适用性。本产品对因使用分析结果而产生的任何后果不承担责任。</p>
        </div>
      </div>
    </div>
  )
}
