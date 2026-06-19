import { NextRequest } from 'next/server'
import { query, execute, transaction } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 知识库列表
export async function GET(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const url = new URL(req.url)
    const categoryId = parseInt(url.searchParams.get('categoryId') || '0', 10)
    const search = (url.searchParams.get('search') || '').trim()
    const page = Math.max(1, parseInt(url.searchParams.get('page') || '1', 10) || 1)
    const pageSize = 20
    const offset = (page - 1) * pageSize

    let where = 'WHERE ki.deleted_at IS NULL'
    let whereDeleted = 'WHERE ki.deleted_at IS NOT NULL'
    const params: any[] = []
    const paramsDeleted: any[] = []

    if (categoryId > 0) {
      where += ' AND ki.category_id = ?'
      whereDeleted += ' AND ki.category_id = ?'
      params.push(categoryId)
      paramsDeleted.push(categoryId)
    }
    if (search) {
      const s = `%${search}%`
      where += ' AND (ki.title LIKE ? OR ki.body LIKE ?)'
      params.push(s, s)
      whereDeleted += ' AND (ki.title LIKE ? OR ki.body LIKE ?)'
      paramsDeleted.push(s, s)
    }

    const [cats, rows, countRows, deletedCountRows] = await Promise.all([
      query<any>('SELECT id, name FROM knowledge_categories WHERE deleted_at IS NULL ORDER BY sort_order'),
      query<any>(
        `SELECT ki.*, kc.name as category_name
         FROM knowledge_items ki JOIN knowledge_categories kc ON kc.id = ki.category_id
         ${where} ORDER BY ki.id DESC LIMIT ? OFFSET ?`,
        [...params, pageSize, offset],
      ),
      query<any>(`SELECT COUNT(*) as total FROM knowledge_items ki ${where}`, params),
      query<any>(`SELECT COUNT(*) as total FROM knowledge_items ki ${whereDeleted}`, paramsDeleted),
    ])

    // 加载标签
    const ids = rows.map((r: any) => r.id)
    let tagMap: Record<number, string[]> = {}
    if (ids.length > 0) {
      const tagRows = await query<any>(
        `SELECT kit.knowledge_item_id, kt.tag_name FROM knowledge_item_tags kit
         JOIN knowledge_tags kt ON kt.id = kit.knowledge_tag_id WHERE kit.knowledge_item_id IN (${ids.map(() => '?').join(',')})`,
        ids,
      )
      for (const t of tagRows) {
        if (!tagMap[t.knowledge_item_id]) tagMap[t.knowledge_item_id] = []
        tagMap[t.knowledge_item_id].push(t.tag_name)
      }
    }

    return success({
      categories: cats,
      items: rows.map((r: any) => ({
        id: r.id, title: r.title, categoryId: r.category_id, categoryName: r.category_name,
        body: r.body, applicableScene: r.applicable_scene || '', sourceNote: r.source_note || '',
        isEnabled: !!r.is_enabled, isHomeRecommended: !!r.is_home_recommended,
        tags: tagMap[r.id] || [], deletedAt: r.deleted_at,
      })),
      pagination: { page, pageSize, total: countRows[0]?.total || 0, deletedTotal: deletedCountRows[0]?.total || 0 },
    })
  } catch (err) { return error(err) }
}

// 创建知识条目
export async function POST(req: NextRequest) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const body = await req.json()
    const { categoryId, title, body: itemBody, applicableScene, sourceNote, isHomeRecommended, tags } = body

    const result = await transaction(async (conn) => {
      const [res] = await conn.execute(
        `INSERT INTO knowledge_items (category_id, title, body, applicable_scene, source_note, is_enabled, is_home_recommended)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [categoryId, title, itemBody, applicableScene || null, sourceNote || null, isHomeRecommended ? 1 : 0],
      ) as any
      const itemId = res.insertId

      if (Array.isArray(tags) && tags.length > 0) {
        for (const tag of tags) {
          const t = tag.toString().trim()
          if (!t) continue
          let [et] = await conn.query('SELECT id FROM knowledge_tags WHERE tag_name = ? LIMIT 1', [t]) as any
          let tagId = et.length > 0 ? et[0].id : (await conn.execute('INSERT INTO knowledge_tags (tag_name) VALUES (?)', [t]) as any)[0].insertId
          try { await conn.execute('INSERT IGNORE INTO knowledge_item_tags (knowledge_item_id, knowledge_tag_id) VALUES (?, ?)', [itemId, tagId]) } catch {}
        }
      }
      return itemId
    })

    return success({ id: result, saved: true })
  } catch (err) { return error(err) }
}
