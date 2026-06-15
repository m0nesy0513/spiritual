import { NextRequest, NextResponse } from 'next/server'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ValidationError, UploadError } from '@/lib/errors'
import { saveFile, generateFilename, getMimeType } from '@/lib/storage'
import { query } from '@/lib/db'

const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const MAX_SIZE = 10 * 1024 * 1024 // 10MB

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return error(new ValidationError('请选择图片'))

    // 校验格式
    if (!ALLOWED_TYPES.includes(file.type)) {
      return error(new UploadError('UNSUPPORTED_FILE_TYPE', '仅支持 PNG、JPG、JPEG、WEBP 格式'))
    }

    // 校验大小
    if (file.size > MAX_SIZE) {
      return error(new UploadError('UPLOAD_TOO_LARGE', '图片大小超过 10MB，请重新上传'))
    }

    // 保存到临时目录
    const ext = file.type === 'image/png' ? '.png' : file.type === 'image/webp' ? '.webp' : '.jpg'
    const filename = generateFilename(ext)
    const saved = await saveFile(file, 'tmp', String(userId), filename)

    // 写入 file_assets 记录
    const [result] = await query<any>(
      `INSERT INTO file_assets (owner_user_id, file_type, original_name, mime_type, size_bytes, storage_path)
       VALUES (?, 'screenshot', ?, ?, ?, ?)`,
      [userId, saved.originalName, saved.mimeType, saved.size, saved.storagePath],
    )

    return success({
      fileId: String(result.insertId),
      previewUrl: `/api/files/${result.insertId}`,
      mimeType: saved.mimeType,
      size: saved.size,
    })
  } catch (err) {
    return error(err)
  }
}
