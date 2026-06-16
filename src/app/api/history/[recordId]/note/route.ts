import { NextRequest } from 'next/server'
import { query, execute, transaction } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const body = await req.json()
    const { noteText } = body

    // 校验记录归属
    const [rec] = await query<any>(
      'SELECT id FROM analysis_records WHERE record_public_id = ? AND user_id = ? LIMIT 1',
      [recordId, userId],
    )
    if (!rec) return error(new ForbiddenError('记录不存在'))

    await transaction(async (conn) => {
      // 查找已有的笔记来源关联
      const [existing] = await conn.query(
        `SELECT n.id as note_id FROM notes n
         JOIN note_source_relations nsr ON nsr.note_id = n.id
         WHERE nsr.source_type = 'history' AND nsr.source_id = ? AND n.user_id = ? LIMIT 1`,
        [rec.id, userId],
      ) as any

      const rows = Array.isArray(existing) ? existing : []

      if (rows.length > 0) {
        // 更新已有笔记
        const noteId = rows[0].note_id
        if (noteText) {
          await conn.execute('UPDATE notes SET body = ?, updated_at = NOW() WHERE id = ?', [noteText, noteId])
        } else {
          // 空内容则删除关联和笔记
          await conn.execute('DELETE FROM note_source_relations WHERE note_id = ? AND source_type = ?', [noteId, 'history'])
          await conn.execute('DELETE FROM notes WHERE id = ?', [noteId])
        }
      } else if (noteText) {
        // 创建新笔记
        const title = noteText.slice(0, 60)
        const [result] = await conn.execute(
          'INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)',
          [userId, title, noteText],
        ) as any
        await conn.execute(
          'INSERT INTO note_source_relations (note_id, source_type, source_id, source_title_snapshot) VALUES (?, ?, ?, ?)',
          [result.insertId, 'history', rec.id, title],
        )
      }
    })

    return success({ saved: true })
  } catch (err) {
    return error(err)
  }
}
