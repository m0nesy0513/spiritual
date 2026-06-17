/**
 * 知识库种子脚本 — 批量版
 * 从 xlsx 文件导入到对应分类
 *
 * 用法：node scripts/seed-knowledge.mjs
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

// 文件 → 分类名 映射
const BATCH = [
  { file: '社交媒体焦虑知识库_人设图鉴.xlsx',            category: '人设图鉴' },
  { file: '社交媒体焦虑知识库_社交媒体套路拆解.xlsx',      category: '社交媒体套路拆解' },
  { file: '社交媒体焦虑知识库_CBT与心理学方法.xlsx',      category: 'CBT / 心理学方法' },
  { file: '社交媒体焦虑知识库_情绪急救步骤.xlsx',         category: '情绪急救步骤' },
  { file: '社交媒体焦虑知识库_行动建议库.xlsx',           category: '行动建议库' },
  { file: '社交媒体焦虑知识库_典型案例.xlsx',             category: '典型案例' },
  { file: '社交媒体焦虑知识库_自我安抚与反比较训练.xlsx',  category: '自我安抚 / 反比较训练' },
]

async function importFile(conn, XLSX, file, categoryName) {
  const wb = XLSX.default.readFile(resolve(root, file))
  const ws = wb.Sheets[wb.SheetNames[0]]
  const data = XLSX.default.utils.sheet_to_json(ws, { header: 1 })

  const items = data.slice(3).filter(r => r[0] && r[0].toString().trim())
  if (items.length === 0) {
    console.log(`[seed] ⚠️  ${file}: no items`)
    return 0
  }

  // 获取分类 ID
  const [cats] = await conn.query(
    'SELECT id FROM knowledge_categories WHERE name = ? AND deleted_at IS NULL LIMIT 1',
    [categoryName]
  )
  if (cats.length === 0) throw new Error(`Category '${categoryName}' not found`)
  const categoryId = cats[0].id

  // 归档旧条目
  const [oldItems] = await conn.query(
    'SELECT id FROM knowledge_items WHERE category_id = ? AND deleted_at IS NULL',
    [categoryId]
  )
  const oldIds = oldItems.map(r => r.id)
  if (oldIds.length > 0) {
    await conn.query('DELETE FROM knowledge_item_tags WHERE knowledge_item_id IN (?)', [oldIds])
    await conn.query('UPDATE knowledge_items SET deleted_at = NOW() WHERE id IN (?)', [oldIds])
    console.log(`  Archived ${oldIds.length} old items`)
  }

  // 收集 tags
  const allTags = new Set()
  for (const row of items) {
    const tagStr = (row[3] || '').toString().trim()
    tagStr.split(/[,，]/).forEach(t => {
      const tag = t.trim()
      if (tag) allTags.add(tag)
    })
  }

  // 创建不存在的 tags
  const tagMap = new Map()
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

  // 插入条目
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

  const recCount = items.filter(r => (r[6]||'').toString().trim() === '是').length
  console.log(`  ✅ ${inserted} items (${recCount} recommended) into "${categoryName}"`)
  return inserted
}

async function main() {
  const XLSX = await import('xlsx')

  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'spiritualrefuge',
    password: '123456',
    database: 'spiritualrefuge',
    charset: 'utf8mb4',
  })

  let total = 0
  try {
    for (const { file, category } of BATCH) {
      console.log(`[seed] 📄 ${file} → "${category}"`)
      await conn.beginTransaction()
      try {
        const n = await importFile(conn, XLSX, file, category)
        await conn.commit()
        total += n
      } catch (err) {
        await conn.rollback()
        console.error(`  ❌ Failed: ${err.message}`)
      }
    }
    console.log(`\n[seed] 🎉 Total imported: ${total} items across ${BATCH.length} categories`)
  } finally {
    await conn.end()
  }
}

main()
