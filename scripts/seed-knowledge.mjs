/**
 * 知识库种子脚本
 * 从 1知识库.xlsx 导入 "焦虑类型解释" 条目到 knowledge_items 表
 *
 * 用法：node scripts/seed-knowledge.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function main() {
  // 动态 import xlsx
  const XLSX = await import('xlsx')
  const wb = XLSX.default.readFile(resolve(root, '1知识库.xlsx'))
  const ws = wb.Sheets['导入表']
  const data = XLSX.default.utils.sheet_to_json(ws, { header: 1 })

  // rows 3 onwards = data (row 0=title, 1=desc, 2=headers)
  const items = data.slice(3).filter(r => r[0] && r[0].toString().trim())

  if (items.length === 0) {
    console.log('[seed] No items found in xlsx')
    return
  }

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'spiritualrefuge',
    password: '123456',
    database: 'spiritualrefuge',
    charset: 'utf8mb4',
  })

  try {
    await conn.beginTransaction()

    // 1. 获取分类 ID
    const [cats] = await conn.query(
      "SELECT id FROM knowledge_categories WHERE name = '焦虑类型解释' AND deleted_at IS NULL LIMIT 1"
    )
    if (cats.length === 0) throw new Error("Category '焦虑类型解释' not found")
    const categoryId = cats[0].id

    // 2. 获取旧条目 ID 以清理关联
    const [oldItems] = await conn.query(
      'SELECT id FROM knowledge_items WHERE category_id = ? AND deleted_at IS NULL',
      [categoryId]
    )
    const oldIds = oldItems.map(r => r.id)

    if (oldIds.length > 0) {
      // 删除旧的 tag 关联
      await conn.query('DELETE FROM knowledge_item_tags WHERE knowledge_item_id IN (?)', [oldIds])
      // 软删除旧条目
      await conn.query('UPDATE knowledge_items SET deleted_at = NOW() WHERE id IN (?)', [oldIds])
      console.log(`[seed] Archived ${oldIds.length} old items`)
    }

    // 3. 收集所有 tags 并创建不存在的
    const allTags = new Set()
    for (const row of items) {
      const tagStr = (row[3] || '').toString().trim()
      tagStr.split(/[,，]/).forEach(t => {
        const tag = t.trim()
        if (tag) allTags.add(tag)
      })
    }

    const tagMap = new Map() // tagName -> tagId
    for (const tag of allTags) {
      const [existing] = await conn.query(
        'SELECT id FROM knowledge_tags WHERE tag_name = ? LIMIT 1', [tag]
      )
      if (existing.length > 0) {
        tagMap.set(tag, existing[0].id)
      } else {
        const [res] = await conn.query(
          'INSERT INTO knowledge_tags (tag_name) VALUES (?)', [tag]
        )
        tagMap.set(tag, res.insertId)
      }
    }
    console.log(`[seed] ${allTags.size} tags ready`)

    // 4. 插入新条目
    let inserted = 0
    for (const row of items) {
      const title = (row[0] || '').toString().trim()
      const body = (row[2] || '').toString().trim()
      const tags = (row[3] || '').toString().trim()
      const scene = (row[4] || '').toString().trim()
      const sourceNote = (row[5] || '').toString().trim()
      const isRecommended = (row[6] || '').toString().trim() === '是' ? 1 : 0

      if (!title) continue

      const [res] = await conn.query(
        `INSERT INTO knowledge_items
          (category_id, title, body, applicable_scene, source_note, is_enabled, is_home_recommended)
         VALUES (?, ?, ?, ?, ?, 1, ?)`,
        [categoryId, title, body, scene || null, sourceNote || null, isRecommended]
      )
      const itemId = res.insertId

      // 插入 tag 关联（去重）
      const itemTags = [...new Set(tags.split(/[,，]/).map(t => t.trim()).filter(Boolean))]
      for (const tag of itemTags) {
        const tagId = tagMap.get(tag)
        if (tagId) {
          try {
            await conn.query(
              'INSERT IGNORE INTO knowledge_item_tags (knowledge_item_id, knowledge_tag_id) VALUES (?, ?)',
              [itemId, tagId]
            )
          } catch { /* ignore duplicates */ }
        }
      }
      inserted++
    }

    await conn.commit()
    console.log(`[seed] ✅ Imported ${inserted} items into "焦虑类型解释"`)
    console.log(`[seed] 📌 Home recommended: ${items.filter(r => (r[6]||'').toString().trim() === '是').length}`)

  } catch (err) {
    await conn.rollback()
    console.error('[seed] ❌ Failed:', err.message)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

main()
