import { NextRequest } from 'next/server'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ValidationError, ForbiddenError } from '@/lib/errors'
import { query } from '@/lib/db'
import { readFile } from '@/lib/storage'
import { recognizeImageText } from '@/lib/ocr'

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const body = await req.json()
    const { fileId } = body
    if (!fileId) return error(new ValidationError('缺少文件 ID'))

    // 校验文件归属
    const rows = await query<any>(
      'SELECT * FROM file_assets WHERE id = ? AND owner_user_id = ? LIMIT 1',
      [fileId, userId],
    )
    if (rows.length === 0) return error(new ForbiddenError('文件不存在或无权访问'))

    const file = rows[0]

    // 读取文件
    const buffer = readFile(file.storage_path)

    // 调用 OCR 识别
    const result = await recognizeImageText(buffer, file.mime_type)

    return success({
      text: result.text,
      confidence: result.confidence,
      needManualSupplement: result.needManualSupplement,
    })
  } catch (err) {
    return error(err)
  }
}
