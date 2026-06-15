'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const router = useRouter()
  const [credentialValue, setCredentialValue] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [credentialType, setCredentialType] = useState<'phone' | 'email'>('phone')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!credentialValue.trim()) { setError('请输入手机号或邮箱'); return }
    if (!password) { setError('请输入密码'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialType, credentialValue: credentialValue.trim(), password }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || '登录失败')
        return
      }
      router.push(data.data.nextPage)
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  const isEmail = credentialValue.includes('@')

  return (
    <div className="min-h-screen flex flex-col bg-amber-50">
      <div className="flex-1 flex flex-col justify-center px-6 max-w-md mx-auto w-full">
        <h1 className="text-3xl font-bold text-amber-700 text-center mb-2">精神避难所</h1>
        <p className="text-gray-400 text-center mb-8">今天想聊聊哪条截图？</p>

        <form onSubmit={handleLogin} className="space-y-4">
          {/* 凭证类型切换 */}
          <div className="flex rounded-xl bg-white border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => setCredentialType('phone')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                credentialType === 'phone' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'
              }`}
            >
              手机号
            </button>
            <button
              type="button"
              onClick={() => setCredentialType('email')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                credentialType === 'email' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'
              }`}
            >
              邮箱
            </button>
          </div>

          {/* 账号 */}
          <input
            type={credentialType === 'phone' ? 'tel' : 'email'}
            placeholder={credentialType === 'phone' ? '手机号' : '邮箱'}
            value={credentialValue}
            onChange={(e) => { setCredentialValue(e.target.value); setError('') }}
            className="input-base"
            autoFocus
          />

          {/* 密码 */}
          <input
            type="password"
            placeholder="密码"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            className="input-base"
          />

          {/* 错误 */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}

          {/* 登录按钮 */}
          <button type="submit" disabled={loading} className="btn-primary w-full text-center text-base">
            {loading ? '登录中…' : '登录'}
          </button>
        </form>

        <div className="flex justify-between mt-4">
          <a href="/reset-password" className="text-amber-600 text-sm">忘记密码</a>
          <a href="/register" className="text-amber-600 text-sm">去注册</a>
        </div>

        <p className="text-gray-300 text-xs text-center mt-10">
          未登录只能浏览登录、注册、找回密码、用户协议、隐私政策、免责声明等页面
        </p>
      </div>
    </div>
  )
}
