import { NextRequest } from 'next/server'
import { query, execute, transaction } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const url = new URL(req.url)
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20)
    const offset = (page - 1) * pageSize
    const search = url.searchParams.get('search') || ''

    const uid = Number(userId)

    let where = 'WHERE n.user_id = ?'
    const params: any[] = [uid]
    if (search) {
      where += ' AND (n.title LIKE ? OR n.body LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }

    // 总数
    const [countRow] = await query<any>(`SELECT COUNT(*) as total FROM notes n ${where}`, params)
    const total = countRow?.total || 0

    // 列表
    const rows = await query<any>(
      `SELECT n.id, n.title, n.body, n.created_at, n.updated_at
       FROM notes n ${where}
       ORDER BY n.updated_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )

    // 批量加载标签和来源
    const noteIds = rows.map((r: any) => r.id)
    let allTags: Record<number, string[]> = {}
    let allSources: Record<number, any[]> = {}

    if (noteIds.length > 0) {
      const placeholders = noteIds.map(() => '?').join(',')

      const tagRows = await query<any>(
        `SELECT ntr.note_id, nt.tag_name
         FROM note_tag_relations ntr JOIN note_tags nt ON nt.id = ntr.tag_id
         WHERE ntr.note_id IN (${placeholders})`,
        noteIds,
      )
      for (const t of tagRows) {
        if (!allTags[t.note_id]) allTags[t.note_id] = []
        allTags[t.note_id].push(t.tag_name)
      }

      const srcRows = await query<any>(
        `SELECT note_id, source_type, source_id, source_title_snapshot, source_status_snapshot
         FROM note_source_relations WHERE note_id IN (${placeholders})`,
        noteIds,
      )
      for (const s of srcRows) {
        if (!allSources[s.note_id]) allSources[s.note_id] = []
        allSources[s.note_id].push(s)
      }
    }

    const notes = rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      body: r.body || '',
      summary: (r.body || '').substring(0, 100).replace(/[#*]/g, '').trim() + '…',
      tags: allTags[r.id] || [],
      sources: (allSources[r.id] || []).map((s: any) => ({
        type: s.source_type,
        id: s.source_id ? String(s.source_id) : null,
        title: s.source_title_snapshot,
        status: s.source_status_snapshot,
      })),
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }))

    return success({
      notes,
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize), hasMore: page * pageSize < total },
    })
  } catch (err) {
    return error(err)
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const body = await req.json()
    const { title, body: noteBody, tags, sourceType, sourceId, sourceTitle } = body
    const titleText = (title || (noteBody || '').slice(0, 60)).toString().trim()
    const bodyText = (noteBody || '').toString().trim()
    const uid = Number(userId)

    const result = await transaction(async (conn) => {
      const [res] = await conn.execute(
        'INSERT INTO notes (user_id, title, body) VALUES (?, ?, ?)',
        [uid, titleText, bodyText],
      ) as any
      const noteId = res.insertId

      // 标签
      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          const t = tag.toString().trim()
          if (!t || t.length > 10) continue
          // 找已有或创建
          let [et] = await conn.query('SELECT id FROM note_tags WHERE user_id = ? AND tag_name = ? LIMIT 1', [uid, t]) as any
          let tagId: number
          if (et.length > 0) {
            tagId = et[0].id
          } else {
            const [ir] = await conn.execute('INSERT INTO note_tags (user_id, tag_name) VALUES (?, ?)', [uid, t]) as any
            tagId = ir.insertId
          }
          try { await conn.execute('INSERT IGNORE INTO note_tag_relations (note_id, tag_id) VALUES (?, ?)', [noteId, tagId]) } catch { /* dup */ }
        }
      }

      // 来源关联
      if (sourceType && sourceId && ['history', 'knowledge'].includes(sourceType)) {
        await conn.execute(
          'INSERT INTO note_source_relations (note_id, source_type, source_id, source_title_snapshot) VALUES (?, ?, ?, ?)',
          [noteId, sourceType, parseInt(sourceId, 10), sourceTitle?.toString().slice(0, 100) || null],
        )
      }

      return noteId
    })

    return success({ id: String(result), saved: true })
  } catch (err) {
    return error(err)
  }
}
