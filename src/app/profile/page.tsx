'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { MobileLayout } from '@/components/layout'
import { ConfirmModal } from '@/components/common'

interface ProfileData {
  id: string
  username: string
  avatarUrl: string | null
  credentials: { phoneBound: boolean; emailBound: boolean }
  createdAt: string
}

export default function ProfilePage() {
  const router = useRouter()
  const fileRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<ProfileData | null>(null)
  const [loading, setLoading] = useState(true)

  // 弹层状态
  const [showLogout, setShowLogout] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [showUsernameEdit, setShowUsernameEdit] = useState(false)
  const [showBindModal, setShowBindModal] = useState(false)

  // 表单状态
  const [newUsername, setNewUsername] = useState('')
  const [oldPw, setOldPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [bindType, setBindType] = useState<'phone' | 'email'>('email')
  const [bindValue, setBindValue] = useState('')
  const [bindCode, setBindCode] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchProfile()
  }, [])

  async function fetchProfile() {
    try {
      const res = await fetch('/api/user/profile')
      const data = await res.json()
      if (data.success) setProfile(data.data)
    } catch { /* ignore */ }
    finally { setLoading(false) }
  }

  // ===== 修改用户名 =====
  async function saveUsername() {
    setFormError('')
    if (!newUsername.trim()) { setFormError('用户名不能为空'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/user/profile/username', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim() }),
      })
      const data = await res.json()
      if (!data.success) { setFormError(data.error?.message || '修改失败'); return }
      setProfile(p => p ? { ...p, username: newUsername.trim() } : null)
      setShowUsernameEdit(false)
      setFormSuccess('用户名修改成功')
    } catch { setFormError('网络异常') }
    finally { setSaving(false) }
  }

  // ===== 修改密码 =====
  async function savePassword() {
    setFormError('')
    if (!oldPw || !newPw || !confirmPw) { setFormError('请填写所有字段'); return }
    if (newPw !== confirmPw) { setFormError('两次密码输入不一致'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/user/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ oldPassword: oldPw, newPassword: newPw, confirmPassword: confirmPw }),
      })
      const data = await res.json()
      if (!data.success) { setFormError(data.error?.message || '修改失败'); return }
      setShowPasswordModal(false)
      setOldPw(''); setNewPw(''); setConfirmPw('')
      setFormSuccess('密码修改成功')
    } catch { setFormError('网络异常') }
    finally { setSaving(false) }
  }

  // ===== 绑定第二凭证 =====
  async function handleBind() {
    setFormError('')
    if (!bindValue.trim() || !bindCode) { setFormError('请填写完整'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/user/credentials/bind', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credentialType: bindType, credentialValue: bindValue.trim(), code: bindCode }),
      })
      const data = await res.json()
      if (!data.success) { setFormError(data.error?.message || '绑定失败'); return }
      setShowBindModal(false)
      setProfile(p => p ? {
        ...p,
        credentials: {
          ...p.credentials,
          phoneBound: bindType === 'phone' ? true : p.credentials.phoneBound,
          emailBound: bindType === 'email' ? true : p.credentials.emailBound,
        },
      } : null)
      setFormSuccess('绑定成功')
    } catch { setFormError('网络异常') }
    finally { setSaving(false) }
  }

  // ===== 登出 =====
  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
  }

  // ===== 注销 =====
  async function handleDeleteAccount() {
    setSaving(true)
    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmText: '确认注销' }),
      })
      const data = await res.json()
      if (!data.success) { setFormError(data.error?.message || '注销失败'); return }
      router.push('/login')
    } catch { setFormError('网络异常') }
    finally { setSaving(false); setShowDelete(false) }
  }

  if (loading) {
    return <MobileLayout><div className="p-6 text-center text-gray-400 animate-pulse-soft">加载中…</div></MobileLayout>
  }

  if (!profile) {
    return <MobileLayout><div className="p-6 text-center text-gray-400">加载失败，请刷新重试</div></MobileLayout>
  }

  // 默认头像
  const initials = profile.username.charAt(0)

  return (
    <MobileLayout>
      <div className="px-6 pt-8 pb-24 space-y-6">
        {/* 头像与昵称 */}
        <div className="text-center space-y-3">
          <div className="w-20 h-20 mx-auto rounded-full bg-amber-200 flex items-center justify-center text-3xl font-bold text-amber-700 overflow-hidden">
            {profile.avatarUrl
              ? <img src={profile.avatarUrl} alt="头像" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div>
            <h2 className="text-xl font-semibold text-gray-800">{profile.username}</h2>
            <p className="text-xs text-gray-400 mt-1">
              注册于 {new Date(profile.createdAt).toLocaleDateString('zh-CN')}
            </p>
          </div>
          <div className="flex justify-center gap-2 text-xs">
            {profile.credentials.phoneBound && <span className="tag">📱 已绑手机</span>}
            {profile.credentials.emailBound && <span className="tag">📧 已绑邮箱</span>}
            {!profile.credentials.phoneBound && !profile.credentials.emailBound && <span className="text-gray-300">未绑定凭证</span>}
          </div>
        </div>

        {/* 功能入口 */}
        <div className="card space-y-0 divide-y divide-gray-50">
          <MenuItem label="📖 历史记录" onClick={() => router.push('/history')} />
          <MenuItem label="📝 个人笔记" onClick={() => router.push('/notes')} />
          <MenuItem label="📋 产品说明" onClick={() => router.push('/disclaimer')} />
          <MenuItem label="⚠️ 免责声明" onClick={() => router.push('/disclaimer')} />
          <MenuItem label="🎓 新手教程" onClick={async () => {
              await fetch('/api/user/preferences', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tutorialCompleted: false }),
              })
              router.push('/home')
            }} />
          <MenuItem label="💬 用户提议 / 反馈" onClick={() => router.push('/suggestions')} />
        </div>

        {/* 账号设置 */}
        <div className="card space-y-0 divide-y divide-gray-50">
          <MenuItem label="✏️ 修改用户名" onClick={() => { setNewUsername(profile.username); setShowUsernameEdit(true) }} />
          <MenuItem label="🖼️ 修改头像" onClick={() => fileRef.current?.click()} />
          <MenuItem label="🔒 修改密码" onClick={() => setShowPasswordModal(true)} />
          <MenuItem
            label="🔗 补充绑定"
            onClick={() => setShowBindModal(true)}
            disabled={profile.credentials.phoneBound && profile.credentials.emailBound}
          />
          <MenuItem label="🚪 退出登录" onClick={() => setShowLogout(true)} danger />
          <MenuItem label="🗑️ 注销账号" onClick={() => setShowDelete(true)} danger />
        </div>

        {/* 隐藏的文件上传 */}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png" className="hidden"
          onChange={async (e) => {
            const file = e.target.files?.[0]
            if (!file) return
            const formData = new FormData()
            formData.append('file', file)
            try {
              const res = await fetch('/api/user/avatar', { method: 'POST', body: formData })
              const data = await res.json()
              if (data.success) {
                setProfile(p => p ? { ...p, avatarUrl: data.data.avatarUrl } : null)
                setFormSuccess('头像更新成功')
              } else {
                setFormError(data.error?.message || '上传失败')
              }
            } catch { setFormError('网络异常') }
          }}
        />
      </div>

      {/* 成功提示 */}
      {formSuccess && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-green-600 text-white px-4 py-2 rounded-xl text-sm shadow-lg animate-fade-in-up"
          onClick={() => setFormSuccess('')}>
          {formSuccess}
        </div>
      )}

      {/* ===== 修改用户名弹层 ===== */}
      {showUsernameEdit && (
        <div className="fullscreen-overlay" onClick={() => setShowUsernameEdit(false)}>
          <div className="bg-white rounded-2xl mx-4 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">修改用户名</h3>
            <input type="text" value={newUsername} onChange={e => setNewUsername(e.target.value)}
              className="input-base mb-3" maxLength={20} />
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowUsernameEdit(false)} className="flex-1 btn-secondary text-sm">取消</button>
              <button onClick={saveUsername} disabled={saving} className="flex-1 btn-primary text-sm">{saving ? '保存中' : '保存'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 修改密码弹层 ===== */}
      {showPasswordModal && (
        <div className="fullscreen-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="bg-white rounded-2xl mx-4 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">修改密码</h3>
            <input type="password" placeholder="旧密码" value={oldPw} onChange={e => setOldPw(e.target.value)} className="input-base mb-3" />
            <input type="password" placeholder="新密码（至少8位，含字母和数字）" value={newPw} onChange={e => setNewPw(e.target.value)} className="input-base mb-3" />
            <input type="password" placeholder="确认新密码" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} className="input-base mb-3" />
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowPasswordModal(false)} className="flex-1 btn-secondary text-sm">取消</button>
              <button onClick={savePassword} disabled={saving} className="flex-1 btn-primary text-sm">{saving ? '保存中' : '确认'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 绑定凭证弹层 ===== */}
      {showBindModal && (
        <div className="fullscreen-overlay" onClick={() => setShowBindModal(false)}>
          <div className="bg-white rounded-2xl mx-4 p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">补充绑定凭证</h3>
            <div className="flex rounded-xl bg-gray-100 p-1 mb-3">
              <button onClick={() => setBindType('phone')}
                className={`flex-1 py-2 rounded-lg text-sm ${bindType === 'phone' ? 'bg-white shadow text-amber-700' : 'text-gray-400'}`}>手机号</button>
              <button onClick={() => setBindType('email')}
                className={`flex-1 py-2 rounded-lg text-sm ${bindType === 'email' ? 'bg-white shadow text-amber-700' : 'text-gray-400'}`}>邮箱</button>
            </div>
            <input type={bindType === 'phone' ? 'tel' : 'email'} placeholder={bindType === 'phone' ? '手机号' : '邮箱'}
              value={bindValue} onChange={e => setBindValue(e.target.value)} className="input-base mb-3" />
            <input type="text" placeholder="验证码" value={bindCode}
              onChange={e => setBindCode(e.target.value)} className="input-base mb-3" maxLength={6} />
            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}
            <div className="flex gap-3">
              <button onClick={() => setShowBindModal(false)} className="flex-1 btn-secondary text-sm">取消</button>
              <button onClick={handleBind} disabled={saving} className="flex-1 btn-primary text-sm">{saving ? '绑定中' : '确认绑定'}</button>
            </div>
          </div>
        </div>
      )}

      {/* ===== 退出登录确认 ===== */}
      <ConfirmModal open={showLogout} title="退出登录" message="确认退出当前账号？"
        confirmLabel="确认退出" onConfirm={handleLogout} onCancel={() => setShowLogout(false)} />

      {/* ===== 注销账号确认 ===== */}
      <ConfirmModal open={showDelete} title="注销账号" message="注销后将物理删除所有私人数据，包括历史记录、笔记、截图等，此操作不可恢复！"
        confirmLabel="确认注销" danger onConfirm={handleDeleteAccount} onCancel={() => setShowDelete(false)} />
    </MobileLayout>
  )
}

/** 菜单项 */
function MenuItem({ label, onClick, danger, disabled }: {
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-left py-3.5 text-sm transition active:bg-gray-50 disabled:opacity-40 ${
        danger ? 'text-red-500' : 'text-gray-700'
      }`}
    >
      {label}
    </button>
  )
}
