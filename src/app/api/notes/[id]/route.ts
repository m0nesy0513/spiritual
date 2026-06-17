import { NextRequest } from 'next/server'
import { query, execute, transaction } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 获取单条笔记
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return error(new NotFoundError())

    const rows = await query<any>(
      'SELECT * FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
      [numId, Number(userId)],
    )
    if (rows.length === 0) return error(new ForbiddenError('笔记不存在'))

    const n = rows[0]

    const [tags, sources] = await Promise.all([
      query<any>(
        `SELECT nt.id, nt.tag_name FROM note_tag_relations ntr
         JOIN note_tags nt ON nt.id = ntr.tag_id WHERE ntr.note_id = ?`, [n.id],
      ),
      query<any>(
        'SELECT * FROM note_source_relations WHERE note_id = ?', [n.id],
      ),
    ])

    return success({
      id: String(n.id),
      title: n.title,
      body: n.body || '',
      tags: tags.map((t: any) => ({ id: String(t.id), name: t.tag_name })),
      sources: sources.map((s: any) => ({
        type: s.source_type,
        id: s.source_id ? String(s.source_id) : null,
        title: s.source_title_snapshot,
        status: s.source_status_snapshot,
      })),
      createdAt: n.created_at,
      updatedAt: n.updated_at,
    })
  } catch (err) {
    return error(err)
  }
}

// 更新笔记
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return error(new NotFoundError())

    const [existing] = await query<any>(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
      [numId, Number(userId)],
    )
    if (!existing) return error(new ForbiddenError('笔记不存在'))

    const body = await req.json()
    const { title, body: noteBody, tags } = body
    const uid = Number(userId)

    await transaction(async (conn) => {
      // 更新标题和正文
      const newTitle = title?.toString().trim() || noteBody?.toString().slice(0, 60) || ''
      const newBody = (noteBody || '').toString().trim()

      await conn.execute(
        'UPDATE notes SET title = ?, body = ?, updated_at = NOW() WHERE id = ?',
        [newTitle, newBody, numId],
      )

      // 更新标签
      if (Array.isArray(tags)) {
        // 删旧
        await conn.query('DELETE ntr FROM note_tag_relations ntr JOIN note_tags nt ON nt.id = ntr.tag_id WHERE ntr.note_id = ?', [numId])

        for (const tag of tags) {
          const t = tag.toString().trim()
          if (!t || t.length > 10) continue
          let [et] = await conn.query('SELECT id FROM note_tags WHERE user_id = ? AND tag_name = ? LIMIT 1', [uid, t]) as any
          let tagId: number
          if (et.length > 0) {
            tagId = et[0].id
          } else {
            const [ir] = await conn.execute('INSERT INTO note_tags (user_id, tag_name) VALUES (?, ?)', [uid, t]) as any
            tagId = ir.insertId
          }
          try { await conn.execute('INSERT IGNORE INTO note_tag_relations (note_id, tag_id) VALUES (?, ?)', [numId, tagId]) } catch { /* dup */ }
        }
      }
    })

    return success({ id: String(numId), saved: true })
  } catch (err) {
    return error(err)
  }
}

// 删除笔记
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { id } = await params
    const numId = parseInt(id, 10)
    if (isNaN(numId)) return error(new NotFoundError())

    const [existing] = await query<any>(
      'SELECT id FROM notes WHERE id = ? AND user_id = ? LIMIT 1',
      [numId, Number(userId)],
    )
    if (!existing) return error(new ForbiddenError('笔记不存在'))

    await transaction(async (conn) => {
      await conn.query('DELETE FROM note_source_relations WHERE note_id = ?', [numId])
      await conn.query('DELETE FROM note_tag_relations WHERE note_id = ?', [numId])
      await conn.query('DELETE FROM notes WHERE id = ?', [numId])
    })

    return success({ deleted: true })
  } catch (err) {
    return error(err)
  }
}
