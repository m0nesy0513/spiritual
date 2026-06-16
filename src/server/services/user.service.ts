import { query, execute, transaction } from '@/lib/db'
import { hashPassword, comparePassword, validatePassword, validateUsername } from '@/lib/auth'
import { UserRepo } from '@/server/repositories/user.repo'
import { VerificationRepo } from '@/server/repositories/verification.repo'
import { deleteFile } from '@/lib/storage'
import { ValidationError, ForbiddenError } from '@/lib/errors'
import type { PoolConnection } from 'mysql2/promise'

// ============================================
// 获取用户资料
// ============================================
export async function getProfile(userId: number) {
  const user = await UserRepo.findUserById(userId)
  if (!user) throw new ValidationError('用户不存在')

  const creds = await UserRepo.getUserBoundCredentials(userId)
  const phoneBound = creds.some(c => c.credential_type === 'phone')
  const emailBound = creds.some(c => c.credential_type === 'email')

  return {
    id: String(user.id),
    username: user.username,
    avatarUrl: user.avatar_file_id ? `/api/files/${user.avatar_file_id}` : null,
    credentials: { phoneBound, emailBound },
    createdAt: user.created_at,
  }
}

// ============================================
// 修改用户名
// ============================================
export async function updateUsername(userId: number, username: string) {
  const check = validateUsername(username)
  if (!check.valid) throw new ValidationError(check.message!)

  await execute('UPDATE users SET username = ? WHERE id = ?', [username, userId])
  return { username }
}

// ============================================
// 上传/修改头像
// ============================================
export async function updateAvatar(userId: number, file: File) {
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    throw new ValidationError('仅支持 JPG 和 PNG 格式')
  }
  if (file.size > 2 * 1024 * 1024) {
    throw new ValidationError('头像大小超过 2MB，请重新上传')
  }

  const { saveFile, generateFilename } = await import('@/lib/storage')
  const ext = file.type === 'image/png' ? '.png' : '.jpg'
  const filename = generateFilename(ext)
  const saved = await saveFile(file, 'avatars', String(userId), filename)

  const rows = await query<any>('SELECT avatar_file_id FROM users WHERE id = ?', [userId])
  const oldFileId = rows[0]?.avatar_file_id

  // 保存新文件记录
  const [result] = await query<any>(
    `INSERT INTO file_assets (owner_user_id, file_type, original_name, mime_type, size_bytes, storage_path)
     VALUES (?, 'avatar', ?, ?, ?, ?)`,
    [userId, saved.originalName, saved.mimeType, saved.size, saved.storagePath],
  )

  // 更新用户头像引用
  await execute('UPDATE users SET avatar_file_id = ? WHERE id = ?', [result.insertId, userId])

  // 删除旧头像
  if (oldFileId) {
    const oldFiles = await query<any>('SELECT * FROM file_assets WHERE id = ?', [oldFileId])
    if (oldFiles[0]) {
      await deleteFile(oldFiles[0].storage_path)
      await execute('DELETE FROM file_assets WHERE id = ?', [oldFileId])
    }
  }

  return { avatarFileId: String(result.insertId), avatarUrl: `/api/files/${result.insertId}` }
}

// ============================================
// 修改密码
// ============================================
export async function changePassword(userId: number, oldPassword: string, newPassword: string, confirmPassword: string) {
  if (newPassword !== confirmPassword) throw new ValidationError('两次密码输入不一致')

  const pwCheck = validatePassword(newPassword)
  if (!pwCheck.valid) throw new ValidationError(pwCheck.message!)

  const creds = await query<any>(
    'SELECT * FROM user_credentials WHERE user_id = ? AND is_primary = TRUE LIMIT 1',
    [userId],
  )
  if (!creds[0]) throw new ValidationError('账号异常')

  const ok = await comparePassword(oldPassword, creds[0].password_hash)
  if (!ok) throw new ValidationError('旧密码错误')

  if (oldPassword === newPassword) throw new ValidationError('新密码不能与旧密码相同')

  const newHash = await hashPassword(newPassword)
  await UserRepo.updatePassword(userId, newHash)

  return { passwordChanged: true }
}

// ============================================
// 绑定第二凭证
// ============================================
export async function bindCredential(userId: number, credentialType: 'phone' | 'email', credentialValue: string, code: string) {
  const taken = await UserRepo.isCredentialTaken(credentialType, credentialValue, userId)
  if (taken) throw new ValidationError('该凭证已被其他账号绑定')

  const codeOk = await VerificationRepo.verify(credentialType, credentialValue, 'bind_credential', code)
  if (!codeOk) throw new ValidationError('验证码错误或已过期')

  const creds = await UserRepo.getUserBoundCredentials(userId)
  const alreadyBound = creds.some(c => c.credential_type === credentialType)
  if (alreadyBound) throw new ValidationError('该类型凭证已绑定')

  const passwordHash = await query<any>(
    'SELECT password_hash FROM user_credentials WHERE user_id = ? LIMIT 1',
    [userId],
  )

  await execute(
    `INSERT INTO user_credentials (user_id, credential_type, credential_value, password_hash, is_primary)
     VALUES (?, ?, ?, ?, FALSE)`,
    [userId, credentialType, credentialValue, passwordHash[0].password_hash],
  )

  return { credentialType, bound: true }
}

// ============================================
// 注销账号
// ============================================
export async function deleteAccount(userId: number) {
  await transaction(async (conn: PoolConnection) => {
    // 获取所有关联文件
    const files = await conn.query(
      'SELECT storage_path FROM file_assets WHERE owner_user_id = ?',
      [userId],
    ) as any[]

    // 删除物理文件
    for (const f of files[0]) {
      try { await deleteFile(f.storage_path) } catch { /* 文件可能已不存在 */ }
    }

    // 匿名化用户提议
    await conn.execute(
      `UPDATE user_suggestions SET user_id = NULL, content = NULL, contact_text = NULL,
       submitter_display_snapshot = '已注销用户提交', anonymized_at = NOW()
       WHERE user_id = ?`,
      [userId],
    )

    // 删除个人笔记及其关联
    await conn.execute('DELETE FROM note_source_relations WHERE note_id IN (SELECT id FROM notes WHERE user_id = ?)', [userId])
    await conn.execute('DELETE FROM note_tag_relations WHERE note_id IN (SELECT id FROM notes WHERE user_id = ?)', [userId])
    await conn.execute('DELETE FROM notes WHERE user_id = ?', [userId])
    await conn.execute('DELETE FROM note_tags WHERE user_id = ?', [userId])

    // 删除历史记录关联
    await conn.execute('DELETE FROM record_custom_tag_relations WHERE record_id IN (SELECT id FROM analysis_records WHERE user_id = ?)', [userId])
    await conn.execute('DELETE FROM record_custom_tags WHERE user_id = ?', [userId])

    // 删除分析相关数据
    const records = await conn.query('SELECT id FROM analysis_records WHERE user_id = ?', [userId]) as any[]
    for (const r of records[0]) {
      await conn.execute('DELETE FROM analysis_results WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_keywords WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_persona_tags WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_anxiety_tags WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_sources_snapshot WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_disclaimer_snapshots WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_risk_states WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_history_summaries WHERE record_id = ?', [r.id])
      await conn.execute('DELETE FROM analysis_feedbacks WHERE record_id = ?', [r.id])
    }
    await conn.execute('DELETE FROM analysis_records WHERE user_id = ?', [userId])

    // 删除文件记录
    await conn.execute('DELETE FROM file_assets WHERE owner_user_id = ?', [userId])

    // 删除账号
    await conn.execute('DELETE FROM user_compliance_confirmations WHERE user_id = ?', [userId])
    await conn.execute('DELETE FROM user_preferences WHERE user_id = ?', [userId])
    await conn.execute('DELETE FROM user_profiles WHERE user_id = ?', [userId])
    await conn.execute('DELETE FROM user_credentials WHERE user_id = ?', [userId])
    await conn.execute('DELETE FROM users WHERE id = ?', [userId])
  })

  return { accountDeleted: true, loggedOut: true }
}
