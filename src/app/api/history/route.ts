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
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
    const offset = (page - 1) * pageSize
    const search = url.searchParams.get('search') || ''

    // 拼接搜索条件
    let searchClause = ''
    const params: any[] = [userId]
    if (search) {
      searchClause = `AND (hs.one_sentence_summary LIKE ? OR hs.keywords LIKE ?)`
      params.push(`%${search}%`, `%${search}%`)
    }

    // 查询总数
    const [countRow] = await query<any>(
      `SELECT COUNT(*) as total FROM analysis_records ar
       LEFT JOIN analysis_history_summaries hs ON hs.record_id = ar.id
       WHERE ar.user_id = ? AND ar.status = 'completed' ${searchClause}`,
      params,
    )

    // 查询列表
    const rows = await query<any>(
      `SELECT
         ar.record_public_id,
         ar.created_at,
         ar.source_platform,
         ar.anxiety_score_before,
         ar.screenshot_file_id,
         hs.one_sentence_summary,
         hs.persona_types,
         hs.anxiety_types,
         hs.keywords,
         hs.feedback_summary
       FROM analysis_records ar
       LEFT JOIN analysis_history_summaries hs ON hs.record_id = ar.id
       WHERE ar.user_id = ? AND ar.status = 'completed' ${searchClause}
       ORDER BY ar.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )

    const records = rows.map((row: any) => {
      let personaTypes: any = {}
      let anxietyTypes: any = {}
      let keywords: string[] = []
      try { personaTypes = JSON.parse(row.persona_types || '{}') } catch { /* keep */ }
      try { anxietyTypes = JSON.parse(row.anxiety_types || '{}') } catch { /* keep */ }
      try { keywords = JSON.parse(row.keywords || '[]') } catch { /* keep */ }

      return {
        recordId: row.record_public_id,
        createdAt: row.created_at,
        thumbnailUrl: row.screenshot_file_id ? `/api/files/${row.screenshot_file_id}` : null,
        thumbnailPlaceholder: !row.screenshot_file_id,
        sourcePlatform: row.source_platform || '',
        anxietyScoreBefore: row.anxiety_score_before,
        primaryPersonaType: typeof personaTypes === 'object' ? (personaTypes.primary || '') : '',
        primaryAnxietyType: typeof anxietyTypes === 'object' ? (anxietyTypes.primary || '') : '',
        oneSentenceSummary: row.one_sentence_summary || '',
        keywords: Array.isArray(keywords) ? keywords.slice(0, 4) : [],
        feedbackSubmitted: !!row.feedback_summary,
        feedbackSummary: row.feedback_summary || '',
      }
    })

    return success({
      records,
      pagination: {
        page,
        pageSize,
        total: countRow.total,
        totalPages: Math.ceil(countRow.total / pageSize),
        hasMore: page * pageSize < countRow.total,
      },
    })
  } catch (err) {
    return error(err)
  }
}
