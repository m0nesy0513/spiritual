import { appConfig } from '@/config/app.config'
import { logger } from '@/lib/logger'

/**
 * 短信发送适配器 — 阿里云短信
 * 内测阶段 SKIP_VERIFICATION=true 时跳过实际发送
 */

interface SendSMSParams {
  phone: string
  templateCode: string
  templateParam: Record<string, string>
}

export async function sendSMS({ phone, templateCode, templateParam }: SendSMSParams): Promise<boolean> {
  if (appConfig.verification.skipVerification) {
    logger.info('[SMS] Skipped (verification disabled)', { phone })
    return true
  }

  const accessKeyId = process.env.ALIBABA_SMS_ACCESS_KEY_ID
  const accessKeySecret = process.env.ALIBABA_SMS_ACCESS_KEY_SECRET
  const signName = process.env.ALIBABA_SMS_SIGN_NAME || '精神避难所'

  if (!accessKeyId || !accessKeySecret) {
    logger.warn('[SMS] Alibaba Cloud SMS not configured')
    return false
  }

  // TODO: 接入阿里云 SMS SDK
  // 第一版内测阶段跳过，后续通过 @alicloud/dysmsapi20170525 实现
  logger.info('[SMS] Placeholder - Alibaba Cloud SMS integration pending', { phone, signName })
  return true
}
