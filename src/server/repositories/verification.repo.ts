import { query, execute } from '@/lib/db'
import { createHash, randomInt } from 'crypto'

function hashCode(code: string): string {
  return createHash('sha256').update(code).digest('hex')
}

export const VerificationRepo = {
  /** 生成并保存验证码 */
  async create(
    targetType: 'phone' | 'email',
    targetValue: string,
    purpose: 'register' | 'reset_password' | 'bind_credential',
  ): Promise<string> {
    // 内测模式生成固定验证码 000000
    const code = process.env.SKIP_VERIFICATION === 'true' ? '000000' : String(randomInt(100000, 999999))
    const hash = hashCode(code)

    await execute(
      `INSERT INTO verification_codes (target_type, target_value, code_hash, purpose, expires_at)
       VALUES (?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL 5 MINUTE))`,
      [targetType, targetValue, hash, purpose],
    )

    return code // 内测模式返回明文供自动填充，生产环境只返回成功状态
  },

  /** 校验验证码 */
  async verify(
    targetType: 'phone' | 'email',
    targetValue: string,
    purpose: 'register' | 'reset_password' | 'bind_credential',
    code: string,
  ): Promise<boolean> {
    const hash = hashCode(code)
    const rows = await query<any>(
      `SELECT id FROM verification_codes
       WHERE target_type = ? AND target_value = ? AND code_hash = ? AND purpose = ?
         AND consumed_at IS NULL AND expires_at > NOW()
       ORDER BY created_at DESC LIMIT 1`,
      [targetType, targetValue, hash, purpose],
    )
    if (rows.length === 0) return false

    // 标记已使用
    await execute(
      'UPDATE verification_codes SET consumed_at = NOW() WHERE id = ?',
      [rows[0].id],
    )
    return true
  },

  /** 检查是否在冷却期内 */
  async isInCooldown(
    targetType: 'phone' | 'email',
    targetValue: string,
    purpose: string,
  ): Promise<boolean> {
    const rows = await query<any>(
      `SELECT created_at FROM verification_codes
       WHERE target_type = ? AND target_value = ? AND purpose = ?
         AND created_at > DATE_SUB(NOW(), INTERVAL 60 SECOND)
       LIMIT 1`,
      [targetType, targetValue, purpose],
    )
    return rows.length > 0
  },
}
