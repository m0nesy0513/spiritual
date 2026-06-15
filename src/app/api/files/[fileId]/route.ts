import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/api-response'
import { query } from '@/lib/db'
import { readFile } from '@/lib/storage'
import { ForbiddenError, NotFoundError, UnauthorizedError } from '@/lib/errors'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) {
      return NextResponse.json(
        { success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } },
        { status: 401 },
      )
    }

    const { fileId } = await params

    // 查询文件记录
    const rows = await query<any>(
      'SELECT * FROM file_assets WHERE id = ? LIMIT 1',
      [fileId],
    )
    if (rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: 'NOT_FOUND', message: '文件不存在' } },
        { status: 404 },
      )
    }

    const file = rows[0]

    // 校验归属
    if (String(file.owner_user_id) !== userId) {
      return NextResponse.json(
        { success: false, error: { code: 'FORBIDDEN', message: '无权限访问' } },
        { status: 403 },
      )
    }

    // 读取并返回文件
    const buffer = readFile(file.storage_path)
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': file.mime_type,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    console.error('[File access error]', err)
    return NextResponse.json(
      { success: false, error: { code: 'INTERNAL_ERROR', message: '文件读取失败' } },
      { status: 500 },
    )
  }
}
