'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [credentialType, setCredentialType] = useState<'phone' | 'email'>('phone')
  const [credentialValue, setCredentialValue] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedDisclaimer, setAgreedDisclaimer] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [codeSent, setCodeSent] = useState(false)
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)

  // 倒计时
  function startCountdown() {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) { clearInterval(timer); return 0 }
        return c - 1
      })
    }, 1000)
  }

  // 发送验证码
  async function sendCode() {
    if (countdown > 0 || !credentialValue.trim()) return
    setSendingCode(true)
    setError('')
    try {
      const res = await fetch('/api/auth/send-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: credentialType,
          targetValue: credentialValue.trim(),
          purpose: 'register',
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || '发送失败')
        return
      }
      setCodeSent(true)
      startCountdown()
      // 内测模式显示验证码
      if (data.data?.code) {
        setCode(data.data.code)
      }
    } catch {
      setError('网络异常')
    } finally {
      setSendingCode(false)
    }
  }

  // 注册
  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!credentialValue.trim()) { setError('请输入手机号或邮箱'); return }
    if (!code) { setError('请输入验证码'); return }
    if (!password) { setError('请输入密码'); return }
    if (!username.trim()) { setError('用户名不能为空'); return }
    if (!agreedTerms) { setError('请同意用户协议和隐私政策'); return }
    if (!agreedDisclaimer) { setError('请确认已阅读免责声明'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          credentialType,
          credentialValue: credentialValue.trim(),
          code,
          password,
          username: username.trim(),
          agreedToTermsAndPrivacy: agreedTerms,
          confirmedDisclaimer: agreedDisclaimer,
        }),
      })
      const data = await res.json()
      if (!data.success) {
        setError(data.error?.message || '注册失败')
        return
      }
      router.push(data.data.nextPage)
    } catch {
      setError('网络异常，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="flex flex-col px-6 pt-8 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-amber-700 text-center mb-6">注册</h1>

        <form onSubmit={handleRegister} className="space-y-4">
          {/* 凭证类型切换 */}
          <div className="flex rounded-xl bg-white border border-gray-200 p-1">
            <button
              type="button"
              onClick={() => { setCredentialType('phone'); setCodeSent(false); setCode('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                credentialType === 'phone' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'
              }`}
            >
              手机号
            </button>
            <button
              type="button"
              onClick={() => { setCredentialType('email'); setCodeSent(false); setCode('') }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${
                credentialType === 'email' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'
              }`}
            >
              邮箱
            </button>
          </div>

          {/* 手机号/邮箱 */}
          <input
            type={credentialType === 'phone' ? 'tel' : 'email'}
            placeholder={credentialType === 'phone' ? '手机号' : '邮箱'}
            value={credentialValue}
            onChange={(e) => { setCredentialValue(e.target.value); setError('') }}
            className="input-base"
          />

          {/* 验证码 */}
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="验证码"
              value={code}
              onChange={(e) => { setCode(e.target.value); setError('') }}
              className="input-base flex-1"
              maxLength={6}
            />
            <button
              type="button"
              onClick={sendCode}
              disabled={countdown > 0 || sendingCode || !credentialValue.trim()}
              className="btn-secondary text-sm whitespace-nowrap disabled:opacity-50"
            >
              {countdown > 0 ? `${countdown}s` : sendingCode ? '发送中' : codeSent ? '重新发送' : '获取验证码'}
            </button>
          </div>

          {/* 密码 */}
          <input
            type="password"
            placeholder="密码（至少8位，含字母和数字）"
            value={password}
            onChange={(e) => { setPassword(e.target.value); setError('') }}
            className="input-base"
          />

          {/* 用户名 */}
          <input
            type="text"
            placeholder="用户名（中文/英文/数字/下划线，最多20字）"
            value={username}
            onChange={(e) => { setUsername(e.target.value); setError('') }}
            className="input-base"
            maxLength={20}
          />

          {/* 勾选框 */}
          <div className="space-y-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedTerms}
                onChange={(e) => { setAgreedTerms(e.target.checked); setError('') }}
                className="mt-0.5 accent-amber-600"
              />
              <span className="text-sm text-gray-600">
                我已阅读并同意
                <a href="/terms" target="_blank" className="text-amber-600 underline mx-1">用户协议</a>
                和
                <a href="/privacy" target="_blank" className="text-amber-600 underline mx-1">隐私政策</a>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={agreedDisclaimer}
                onChange={(e) => { setAgreedDisclaimer(e.target.checked); setError('') }}
                className="mt-0.5 accent-amber-600"
              />
              <span className="text-sm text-gray-600">
                我已阅读并知悉
                <a href="/disclaimer" target="_blank" className="text-amber-600 underline ml-1">免责声明</a>
              </span>
            </label>
          </div>

          {/* 错误 */}
          {error && (
            <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>
          )}

          {/* 注册按钮 */}
          <button type="submit" disabled={loading} className="btn-primary w-full text-center text-base">
            {loading ? '注册中…' : '注册'}
          </button>
        </form>

        <p className="text-center mt-6">
          <span className="text-gray-400 text-sm">已有账号？</span>
          <a href="/login" className="text-amber-600 text-sm ml-1">去登录</a>
        </p>
      </div>
    </div>
  )
}
