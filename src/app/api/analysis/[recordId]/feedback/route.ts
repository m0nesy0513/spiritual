import { NextRequest } from 'next/server'
import { query, execute } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError, ValidationError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const rows = await query<any>(
      `SELECT af.*, ar.anxiety_score_before, ar.record_public_id
       FROM analysis_feedbacks af
       JOIN analysis_records ar ON ar.id = af.record_id
       WHERE ar.record_public_id = ? AND af.user_id = ? LIMIT 1`,
      [recordId, userId],
    )
    if (rows.length === 0) return success({ feedback: null })

    const f = rows[0]
    return success({
      feedback: {
        feelingAfterOption: f.feeling_after_option,
        usefulnessOption: f.usefulness_option,
        anxietyScoreAfter: f.anxiety_score_after,
        anxietyScoreBefore: f.anxiety_score_before,
        followupText: f.followup_text,
        submittedAt: f.created_at,
      },
    })
  } catch (err) {
    return error(err)
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ recordId: string }> },
) {
  try {
    const { userId } = getSession(req)
    if (!userId) return error(new UnauthorizedError())

    const { recordId } = await params
    const body = await req.json()
    const { feelingAfterOption, usefulnessOption, anxietyScoreAfter, followupText } = body

    // 校验记录归属
    const rows = await query<any>(
      'SELECT id FROM analysis_records WHERE record_public_id = ? AND user_id = ? LIMIT 1',
      [recordId, userId],
    )
    if (rows.length === 0) return error(new ForbiddenError())
    const recordDbId = rows[0].id

    // 检查是否已有反馈
    const existing = await query<any>(
      'SELECT id FROM analysis_feedbacks WHERE record_id = ? LIMIT 1',
      [recordDbId],
    )
    if (existing.length > 0) return error(new ValidationError('反馈已提交'))

    await execute(
      `INSERT INTO analysis_feedbacks (record_id, user_id, feeling_after_option, usefulness_option, anxiety_score_after, followup_text)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [recordDbId, userId, feelingAfterOption || null, usefulnessOption || null, anxietyScoreAfter || null, followupText || null],
    )

    // 更新历史摘要
    const labelMap: Record<string, string> = {
      much_better: '好很多', better: '好一点', no_change: '没有变化', worse: '更糟了',
      very_useful: '很有用', useful: '有点用', average: '一般', not_useful: '没用',
    }
    const summary = [
      feelingAfterOption ? labelMap[feelingAfterOption] : '',
      usefulnessOption ? labelMap[usefulnessOption] : '',
    ].filter(Boolean).join('，')

    await query(
      'UPDATE analysis_history_summaries SET feedback_summary = ? WHERE record_id = ?',
      [summary || null, recordDbId],
    )

    return success({
      submitted: true,
      recordId,
      nextActions: { homeUrl: '/home', knowledgeUrl: '/knowledge', historyDetailUrl: `/history/${recordId}` },
    })
  } catch (err) {
    return error(err)
  }
}
