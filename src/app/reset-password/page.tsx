'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function ResetPasswordPage() {
  const router = useRouter()

  // 两步状态
  const [step, setStep] = useState<1 | 2>(1)

  // 第一步
  const [credentialValue, setCredentialValue] = useState('')
  const [credentialType, setCredentialType] = useState<'phone' | 'email'>('phone')
  const [code, setCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [error, setError] = useState('')

  // 第二步
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  function startCountdown() {
    setCountdown(60)
    const timer = setInterval(() => {
      setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0 } return c - 1 })
    }, 1000)
  }

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
          purpose: 'reset_password',
        }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error?.message || '发送失败'); return }
      startCountdown()
      if (data.data?.code) setCode(data.data.code)
    } catch { setError('网络异常') }
    finally { setSendingCode(false) }
  }

  // 第一步：验证凭证
  async function handleStep1(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!credentialValue.trim()) { setError('请输入手机号或邮箱'); return }
    if (!code) { setError('请输入验证码'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialType, credentialValue: credentialValue.trim(), code }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error?.message || '验证失败'); return }
      setResetToken(data.data.resetToken)
      setStep(2)
    } catch { setError('网络异常') }
    finally { setLoading(false) }
  }

  // 第二步：设置新密码
  async function handleStep2(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!newPassword) { setError('请输入新密码'); return }
    if (newPassword !== confirmPassword) { setError('两次密码输入不一致'); return }

    setLoading(true)
    try {
      const res = await fetch('/api/auth/reset-password/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resetToken, newPassword, confirmPassword }),
      })
      const data = await res.json()
      if (!data.success) { setError(data.error?.message || '重置失败'); return }
      setDone(true)
    } catch { setError('网络异常') }
    finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen bg-amber-50">
      <div className="flex flex-col px-6 pt-8 max-w-md mx-auto w-full">
        <h1 className="text-2xl font-bold text-amber-700 text-center mb-6">找回密码</h1>

        {done ? (
          // 重置成功
          <div className="text-center space-y-6 animate-fade-in-up">
            <div className="text-4xl">✅</div>
            <h2 className="text-xl font-semibold text-gray-700">密码已重置</h2>
            <p className="text-gray-400">请使用新密码登录</p>
            <a href="/login" className="btn-primary inline-block w-full">返回登录</a>
          </div>
        ) : step === 1 ? (
          // 第一步：验证
          <form onSubmit={handleStep1} className="space-y-4">
            <div className="flex rounded-xl bg-white border border-gray-200 p-1">
              <button type="button" onClick={() => setCredentialType('phone')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${credentialType === 'phone' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}>
                手机号
              </button>
              <button type="button" onClick={() => setCredentialType('email')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition ${credentialType === 'email' ? 'bg-amber-100 text-amber-700' : 'text-gray-400'}`}>
                邮箱
              </button>
            </div>

            <input
              type={credentialType === 'phone' ? 'tel' : 'email'}
              placeholder={credentialType === 'phone' ? '已绑定手机号' : '已绑定邮箱'}
              value={credentialValue}
              onChange={(e) => { setCredentialValue(e.target.value); setError('') }}
              className="input-base"
            />

            <div className="flex gap-3">
              <input type="text" placeholder="验证码" value={code}
                onChange={(e) => { setCode(e.target.value); setError('') }}
                className="input-base flex-1" maxLength={6} />
              <button type="button" onClick={sendCode}
                disabled={countdown > 0 || sendingCode || !credentialValue.trim()}
                className="btn-secondary text-sm whitespace-nowrap disabled:opacity-50">
                {countdown > 0 ? `${countdown}s` : sendingCode ? '发送中' : '获取验证码'}
              </button>
            </div>

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '验证中…' : '下一步'}
            </button>

            <a href="/login" className="block text-center text-amber-600 text-sm">返回登录</a>
          </form>
        ) : (
          // 第二步：设置新密码
          <form onSubmit={handleStep2} className="space-y-4">
            <input type="password" placeholder="新密码（至少8位，含字母和数字）"
              value={newPassword} onChange={(e) => { setNewPassword(e.target.value); setError('') }}
              className="input-base" />
            <input type="password" placeholder="确认新密码"
              value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
              className="input-base" />

            {error && <p className="text-red-500 text-sm bg-red-50 rounded-lg px-4 py-2">{error}</p>}

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? '重置中…' : '确认重置'}
            </button>

            <button type="button" onClick={() => setStep(1)} className="block w-full text-center text-amber-600 text-sm">
              返回上一步
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
