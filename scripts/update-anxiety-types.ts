/**
 * 焦虑类型解释 — 全量更新脚本
 *
 * 运行：
 *   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/update-anxiety-types.ts
 *
 * 行为：
 *   1. 清空 knowledge_items 中 category_id = 焦虑类型解释 的全部条目
 *   2. 从 Excel 读取 100 条并写入
 *   3. 同步 knowledge_tags 和 knowledge_item_tags
 */

import * as XLSX from 'xlsx'
import mysql from 'mysql2/promise'
import path from 'path'

const EXCEL_PATH = path.resolve(
  __dirname,
  '../社交媒体焦虑知识库_焦虑类型解释_新增100条版.xlsx',
)

const DB = {
  host: process.env.DATABASE_HOST || '127.0.0.1',
  port: parseInt(process.env.DATABASE_PORT || '3306'),
  user: process.env.DATABASE_USER || 'root',
  password: process.env.DATABASE_PASSWORD || '',
  database: process.env.DATABASE_NAME || 'spiritualrefuge',
}

interface ExcelRow {
  title: string
  category: string
  body: string
  tags: string
  applicable_scene: string
  source_note: string
  is_home_recommended: string // "是" / "否"
}

// ── 读取 Excel ──────────────────────────────────────────

function readExcel(): ExcelRow[] {
  const wb = XLSX.readFile(EXCEL_PATH)
  const sheet = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 })

  const rows: ExcelRow[] = []
  for (let i = 3; i <= 102; i++) {
    const r = raw[i]
    if (!r || !r[0]) continue
    rows.push({
      title: String(r[0] ?? '').trim(),
      category: String(r[1] ?? '').trim(),
      body: String(r[2] ?? '').trim(),
      tags: String(r[3] ?? '').trim(),
      applicable_scene: String(r[4] ?? '').trim(),
      source_note: String(r[5] ?? '').trim(),
      is_home_recommended: String(r[6] ?? '否').trim(),
    })
  }
  return rows
}

// ── 数据库操作 ──────────────────────────────────────────

async function run() {
  const conn = await mysql.createConnection(DB)

  // 取分类 ID
  const [catRows] = await conn.execute(
    'SELECT id FROM knowledge_categories WHERE name = ? LIMIT 1',
    ['焦虑类型解释'],
  ) as any[]
  if (catRows.length === 0) {
    console.error('❌ 找不到「焦虑类型解释」分类')
    process.exit(1)
  }
  const categoryId = catRows[0].id as number

  // 可选：备份旧内容
  const [countBefore] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM knowledge_items WHERE category_id = ?',
    [categoryId],
  ) as any[]
  console.log(`📊 当前有 ${countBefore[0].cnt} 条`)

  // 删除旧数据（knowledge_item_tags CASCADE 自动清理）
  await conn.execute(
    'DELETE FROM knowledge_items WHERE category_id = ?',
    [categoryId],
  )
  console.log(`🗑️  已清空`)

  // 写入 100 条
  const rows = readExcel()
  console.log(`📥 准备写入 ${rows.length} 条…`)

  let inserted = 0
  let skipped = 0

  for (const row of rows) {
    // 跳过内容过短的
    if (!row.body || row.body.length < 30) {
      console.warn(`⚠️  跳过（body 过短）: ${row.title}`)
      skipped++
      continue
    }

    const isRecommended = row.is_home_recommended === '是'

    // 插入条目
    const [result] = await conn.execute(
      `INSERT INTO knowledge_items
        (category_id, title, body, applicable_scene, source_note, is_home_recommended)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        categoryId,
        row.title,
        row.body,
        row.applicable_scene || null,
        row.source_note || null,
        isRecommended ? 1 : 0,
      ],
    ) as any[]
    const itemId = result.insertId

    // 插入标签
    const tagNames = row.tags
      .split(/[,，]/)
      .map((t: string) => t.trim())
      .filter((t: string) => t.length > 0)

    for (const tagName of tagNames) {
      await conn.execute(
        'INSERT IGNORE INTO knowledge_tags (tag_name) VALUES (?)',
        [tagName],
      )
      const [tagRows] = await conn.execute(
        'SELECT id FROM knowledge_tags WHERE tag_name = ?',
        [tagName],
      ) as any[]
      if (tagRows.length > 0) {
        await conn.execute(
          'INSERT IGNORE INTO knowledge_item_tags (knowledge_item_id, knowledge_tag_id) VALUES (?, ?)',
          [itemId, tagRows[0].id],
        )
      }
    }

    inserted++
    if (inserted % 20 === 0) process.stdout.write(`  ${inserted}/${rows.length}…\n`)
  }

  // 确认
  const [countAfter] = await conn.execute(
    'SELECT COUNT(*) AS cnt FROM knowledge_items WHERE category_id = ?',
    [categoryId],
  ) as any[]
  console.log(`✅ 完成 — 现有 ${countAfter[0].cnt} 条（写 ${inserted}，跳 ${skipped}）`)
  console.log(`🏠 首页推荐：${rows.filter(r => r.is_home_recommended === '是').length} 条`)

  await conn.end()
}

run().catch((err) => {
  console.error('❌', err)
  process.exit(1)
})
