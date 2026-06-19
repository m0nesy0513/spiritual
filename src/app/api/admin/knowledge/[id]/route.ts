import { NextRequest } from 'next/server'
import { query, execute, transaction } from '@/lib/db'
import { success, error, getSession } from '@/lib/api-response'
import { UnauthorizedError, ForbiddenError, NotFoundError } from '@/lib/errors'

export const dynamic = 'force-dynamic'

// 更新
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const { id } = await params
    const body = await req.json()
    const { categoryId, title, body: itemBody, applicableScene, sourceNote, isEnabled, isHomeRecommended, tags } = body

    await transaction(async (conn) => {
      await conn.execute(
        `UPDATE knowledge_items SET category_id=?, title=?, body=?, applicable_scene=?, source_note=?,
         is_enabled=?, is_home_recommended=?, updated_at=NOW() WHERE id=?`,
        [categoryId, title, itemBody, applicableScene || null, sourceNote || null, isEnabled ? 1 : 0, isHomeRecommended ? 1 : 0, id],
      )
      // 更新标签
      if (Array.isArray(tags)) {
        await conn.query('DELETE FROM knowledge_item_tags WHERE knowledge_item_id = ?', [id])
        for (const tag of tags) {
          const t = tag.toString().trim()
          if (!t) continue
          let [et] = await conn.query('SELECT id FROM knowledge_tags WHERE tag_name = ? LIMIT 1', [t]) as any
          let tagId = et.length > 0 ? et[0].id : (await conn.execute('INSERT INTO knowledge_tags (tag_name) VALUES (?)', [t]) as any)[0].insertId
          try { await conn.execute('INSERT IGNORE INTO knowledge_item_tags (knowledge_item_id, knowledge_tag_id) VALUES (?, ?)', [id, tagId]) } catch {}
        }
      }
    })

    return success({ id, saved: true })
  } catch (err) { return error(err) }
}

// 删除（软删除）
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = getSession(req)
    if (!session.userId) return error(new UnauthorizedError())
    if (!session.isAdmin) return error(new ForbiddenError('无管理员权限'))

    const { id } = await params
    await execute('UPDATE knowledge_items SET deleted_at = NOW() WHERE id = ?', [id])
    return success({ deleted: true })
  } catch (err) { return error(err) }
}
