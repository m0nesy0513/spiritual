import { NextRequest } from 'next/server'
import { query } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, NotFoundError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

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
      `SELECT ki.id, ki.title, ki.category_id, kc.name as category_name,
              ki.body, ki.applicable_scene, ki.source_note, ki.is_home_recommended
       FROM knowledge_items ki
       JOIN knowledge_categories kc ON kc.id = ki.category_id
       WHERE ki.id = ? AND ki.is_enabled = TRUE AND ki.deleted_at IS NULL LIMIT 1`,
      [numId],
    )
    if (rows.length === 0) return error(new NotFoundError('内容不存在或已停用'))

    const item = rows[0]

    // 加载标签
    const tagRows = await query<any>(
      `SELECT kt.tag_name FROM knowledge_item_tags kit
       JOIN knowledge_tags kt ON kt.id = kit.knowledge_tag_id
       WHERE kit.knowledge_item_id = ?`,
      [item.id],
    )

    // 同分类推荐（3 条）
    const related = await query<any>(
      `SELECT ki.id, ki.title, ki.applicable_scene, ki.body
       FROM knowledge_items ki
       WHERE ki.category_id = ? AND ki.id != ? AND ki.is_enabled = TRUE AND ki.deleted_at IS NULL
       ORDER BY ki.is_home_recommended DESC, ki.id DESC
       LIMIT 3`,
      [item.category_id, item.id],
    )

    return success({
      id: String(item.id),
      title: item.title,
      categoryId: item.category_id,
      categoryName: item.category_name,
      body: item.body,
      applicableScene: item.applicable_scene || '',
      sourceNote: item.source_note || '',
      isHomeRecommended: !!item.is_home_recommended,
      tags: tagRows.map((t: any) => t.tag_name),
      related: related.map((r: any) => ({
        id: String(r.id),
        title: r.title,
        summary: r.applicable_scene || (r.body as string).substring(0, 80).replace(/[#*]/g, '').trim() + '…',
      })),
    })
  } catch (err) {
    return error(err)
  }
}
