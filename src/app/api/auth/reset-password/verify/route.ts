import { NextRequest } from 'next/server'
import { resetPasswordVerify } from '@/server/services/auth.service'
import { success, error } from '@/lib/api-response'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { credentialType, credentialValue, code } = body

    const result = await resetPasswordVerify({ credentialType, credentialValue, code })
    return success(result)
  } catch (err) {
    return error(err)
  }
}
