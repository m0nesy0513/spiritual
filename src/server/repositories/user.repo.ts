import { query, transaction } from '@/lib/db'
import type { PoolConnection } from 'mysql2/promise'

export interface UserRow {
  id: number
  username: string
  avatar_file_id: number | null
  created_at: string
  updated_at: string
}

export interface CredentialRow {
  id: number
  user_id: number
  credential_type: 'phone' | 'email'
  credential_value: string
  password_hash: string
  is_primary: boolean
}

export interface PreferenceRow {
  id: number
  user_id: number
  reference_history_default: boolean
  onboarding_completed: boolean
  tutorial_completed: boolean
}

export const UserRepo = {
  /** 创建用户 */
  async createUser(conn: PoolConnection, username: string): Promise<number> {
    const [r] = await conn.execute(
      'INSERT INTO users (username) VALUES (?)',
      [username],
    ) as any[]
    return r.insertId
  },

  /** 创建凭证 */
  async createCredential(
    conn: PoolConnection,
    userId: number,
    type: 'phone' | 'email',
    value: string,
    passwordHash: string,
    isPrimary: boolean,
  ) {
    await conn.execute(
      `INSERT INTO user_credentials (user_id, credential_type, credential_value, password_hash, is_primary)
       VALUES (?, ?, ?, ?, ?)`,
      [userId, type, value, passwordHash, isPrimary],
    )
  },

  /** 创建用户偏好 */
  async createPreferences(conn: PoolConnection, userId: number) {
    await conn.execute(
      'INSERT INTO user_preferences (user_id) VALUES (?)',
      [userId],
    )
  },

  /** 记录合规确认 */
  async createComplianceConfirmation(
    conn: PoolConnection,
    userId: number,
    type: 'terms_and_privacy' | 'disclaimer',
  ) {
    await conn.execute(
      'INSERT INTO user_compliance_confirmations (user_id, confirmation_type) VALUES (?, ?)',
      [userId, type],
    )
  },

  /** 根据凭证查找用户 */
  async findByCredential(type: 'phone' | 'email', value: string): Promise<CredentialRow | null> {
    const rows = await query<CredentialRow>(
      'SELECT * FROM user_credentials WHERE credential_type = ? AND credential_value = ? LIMIT 1',
      [type, value],
    )
    return rows[0] || null
  },

  /** 查询用户 */
  async findUserById(userId: number): Promise<UserRow | null> {
    const rows = await query<UserRow>('SELECT * FROM users WHERE id = ? LIMIT 1', [userId])
    return rows[0] || null
  },

  /** 获取用户偏好 */
  async getPreferences(userId: number): Promise<PreferenceRow | null> {
    const rows = await query<PreferenceRow>(
      'SELECT * FROM user_preferences WHERE user_id = ? LIMIT 1',
      [userId],
    )
    return rows[0] || null
  },

  /** 更新密码 */
  async updatePassword(userId: number, newHash: string) {
    await query(
      'UPDATE user_credentials SET password_hash = ? WHERE user_id = ?',
      [newHash, userId],
    )
  },

  /** 获取用户已绑定的凭证类型列表 */
  async getUserBoundCredentials(userId: number): Promise<{ credential_type: string }[]> {
    return query(
      'SELECT credential_type FROM user_credentials WHERE user_id = ?',
      [userId],
    )
  },

  /** 检查凭证是否已被别人绑定 */
  async isCredentialTaken(type: 'phone' | 'email', value: string, excludeUserId?: number): Promise<boolean> {
    let sql = 'SELECT COUNT(*) as cnt FROM user_credentials WHERE credential_type = ? AND credential_value = ?'
    const params: unknown[] = [type, value]
    if (excludeUserId) {
      sql += ' AND user_id != ?'
      params.push(excludeUserId)
    }
    const rows = await query<{ cnt: number }>(sql, params)
    return rows[0].cnt > 0
  },
}
