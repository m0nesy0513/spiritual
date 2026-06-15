import { appConfig } from '@/config/app.config'
import { logger } from '@/lib/logger'

/**
 * 邮件发送适配器 — Resend
 * 内测阶段 SKIP_VERIFICATION=true 时跳过实际发送
 */

interface SendEmailParams {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: SendEmailParams): Promise<boolean> {
  if (appConfig.verification.skipVerification) {
    logger.info('[Mail] Skipped (verification disabled)', { to, subject })
    return true
  }

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    logger.warn('[Mail] RESEND_API_KEY not configured')
    return false
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${appConfig.site.name} <noreply@spiritualrefuge.cn>`,
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      logger.error('[Mail] Send failed', { to, status: response.status })
      return false
    }
    return true
  } catch (error) {
    logger.error('[Mail] Send error', { error: String(error) })
    return false
  }
}
