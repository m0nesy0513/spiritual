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
    const categoryId = parseInt(url.searchParams.get('categoryId') || '0', 10)
    const search = (url.searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = Math.min(50, Math.max(1, parseInt(url.searchParams.get('pageSize') || '20', 10) || 20))
    const offset = (page - 1) * pageSize

    // 获取分类列表
    const categories = await query<any>(
      `SELECT kc.id, kc.name,
        (SELECT COUNT(*) FROM knowledge_items ki WHERE ki.category_id = kc.id AND ki.is_enabled = TRUE AND ki.deleted_at IS NULL) as item_count
       FROM knowledge_categories kc
       WHERE kc.is_enabled = TRUE AND kc.deleted_at IS NULL
       ORDER BY kc.sort_order`,
    )

    // 构建查询条件
    let whereClause = 'WHERE ki.is_enabled = TRUE AND ki.deleted_at IS NULL'
    const params: any[] = []

    if (categoryId > 0) {
      whereClause += ' AND ki.category_id = ?'
      params.push(categoryId)
    }
    if (search) {
      whereClause += ' AND (ki.title LIKE ? OR ki.body LIKE ? OR ki.applicable_scene LIKE ? OR ki.source_note LIKE ?)'
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`)
    }

    // 查询总数
    const countRows = await query<any>(
      `SELECT COUNT(*) as total FROM knowledge_items ki ${whereClause}`,
      params,
    )

    // 查询列表（含标签）
    const rows = await query<any>(
      `SELECT ki.id, ki.title, ki.category_id, kc.name as category_name,
              ki.body, ki.applicable_scene, ki.source_note, ki.is_home_recommended
       FROM knowledge_items ki
       JOIN knowledge_categories kc ON kc.id = ki.category_id
       ${whereClause}
       ORDER BY ki.is_home_recommended DESC, RAND(FLOOR(UNIX_TIMESTAMP() / 3600))
       LIMIT ? OFFSET ?`,
      [...params, pageSize, offset],
    )

    // 加载标签
    const itemIds = rows.map((r: any) => r.id)
    let tagMap: Record<number, string[]> = {}
    if (itemIds.length > 0) {
      const tagRows = await query<any>(
        `SELECT kit.knowledge_item_id, kt.tag_name
         FROM knowledge_item_tags kit
         JOIN knowledge_tags kt ON kt.id = kit.knowledge_tag_id
         WHERE kit.knowledge_item_id IN (${itemIds.map(() => '?').join(',')})`,
        itemIds,
      )
      for (const t of tagRows) {
        if (!tagMap[t.knowledge_item_id]) tagMap[t.knowledge_item_id] = []
        tagMap[t.knowledge_item_id].push(t.tag_name)
      }
    }

    const items = rows.map((r: any) => ({
      id: String(r.id),
      title: r.title,
      categoryId: r.category_id,
      categoryName: r.category_name,
      body: r.body,
      applicableScene: r.applicable_scene || '',
      sourceNote: r.source_note || '',
      isHomeRecommended: !!r.is_home_recommended,
      tags: tagMap[r.id] || [],
      summary: r.applicable_scene || stripMarkdown(r.body, 150),
    }))

    return success({
      categories: categories.map((c: any) => ({
        id: c.id,
        name: c.name,
        itemCount: c.item_count,
      })),
      items,
      pagination: {
        page,
        pageSize,
        total: countRows[0]?.total || 0,
        totalPages: Math.ceil((countRows[0]?.total || 0) / pageSize),
        hasMore: page * pageSize < (countRows[0]?.total || 0),
      },
    })
  } catch (err) {
    return error(err)
  }
}

/** 从 markdown 正文中提取纯文本摘要 */
function stripMarkdown(body: string, maxLen: number): string {
  const text = body
    .replace(/^## .+/gm, '')   // 去掉标题行
    .replace(/\*\*/g, '')       // 去掉粗体标记
    .replace(/\n+/g, ' ')       // 换行变空格
    .replace(/\s+/g, ' ')       // 合并空白
    .trim()
  return text.slice(0, maxLen).trim() + '…'
}
