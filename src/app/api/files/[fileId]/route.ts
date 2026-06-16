import { NextRequest } from 'next/server'
import { getSession } from '@/lib/api-response'
import { query } from '@/lib/db'
import { readFile } from '@/lib/storage'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ fileId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) {
      return new Response(JSON.stringify({ success: false, error: { code: 'UNAUTHORIZED', message: '请先登录' } }), {
        status: 401, headers: { 'Content-Type': 'application/json' },
      })
    }

    const { fileId } = await params
    const numId = parseInt(fileId, 10)
    if (isNaN(numId)) {
      return new Response('', { status: 404 })
    }

    const rows = await query<any>('SELECT * FROM file_assets WHERE id = ? LIMIT 1', [numId])
    if (rows.length === 0) {
      return new Response('', { status: 404 })
    }

    const file = rows[0]
    if (String(file.owner_user_id) !== userId) {
      return new Response('', { status: 403 })
    }

    const buffer = readFile(file.storage_path)
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': file.mime_type || 'image/jpeg',
        'Content-Length': String(buffer.length),
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch (err) {
    // fallback: 返回 1x1 透明像素
    const px = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64')
    return new Response(px, {
      status: 200,
      headers: { 'Content-Type': 'image/gif', 'Cache-Control': 'no-store' },
    })
  }
}
