import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const url = new URL(req.url)
    const term = (url.searchParams.get('q') || '').trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
    const offset = (page - 1) * pageSize
    const uid = Number(userId)

    if (!term) {
      return success({ history: [], knowledge: [], notes: [], pagination: { page, pageSize, total: 0 } })
    }

    const like = `%${term}%`

    // 并行搜索三个来源
    const [historyRows, knowledgeRows, notesRows] = await Promise.all([
      query<any>(
        `SELECT ar.record_public_id as id, hs.one_sentence_summary as title,
                ar.created_at as date, 'history' as source_type
         FROM analysis_records ar
         LEFT JOIN analysis_history_summaries hs ON hs.record_id = ar.id
         WHERE ar.user_id = ? AND ar.status = 'completed'
           AND (hs.one_sentence_summary LIKE ? OR hs.keywords LIKE ?)
         ORDER BY ar.created_at DESC LIMIT 5`,
        [uid, like, like],
      ),
      query<any>(
        `SELECT ki.id, ki.title, kc.name as category, ki.applicable_scene,
                ki.is_home_recommended, 'knowledge' as source_type
         FROM knowledge_items ki
         JOIN knowledge_categories kc ON kc.id = ki.category_id
         WHERE ki.is_enabled = TRUE AND ki.deleted_at IS NULL
           AND (ki.title LIKE ? OR ki.body LIKE ? OR ki.applicable_scene LIKE ?)
         ORDER BY ki.is_home_recommended DESC, ki.id DESC LIMIT 5`,
        [like, like, like],
      ),
      query<any>(
        `SELECT n.id, n.title, n.body, n.updated_at as date, 'notes' as source_type
         FROM notes n
         WHERE n.user_id = ? AND (n.title LIKE ? OR n.body LIKE ?)
         ORDER BY n.updated_at DESC LIMIT 5`,
        [uid, like, like],
      ),
    ])

    const history = historyRows.map((r: any) => ({
      id: r.id,
      title: r.title || '分析结果',
      date: r.date,
      sourceType: 'history',
    }))

    const knowledge = knowledgeRows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      category: r.category || '',
      summary: (r.applicable_scene || '').slice(0, 100),
      isRecommended: !!r.is_home_recommended,
      sourceType: 'knowledge',
    }))

    const notes = notesRows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      summary: (r.body || '').substring(0, 100).replace(/[#*]/g, '').trim() + '…',
      date: r.date,
      sourceType: 'notes',
    }))

    const total = history.length + knowledge.length + notes.length

    return success({
      history,
      knowledge,
      notes,
      term,
      pagination: { page, pageSize, total },
    })
  } catch (err) {
    return error(err)
  }
}
