/**
 * 数据库导出脚本 — 生成 SQL 文件用于阿里云导入
 * 用法：node scripts/export-db.mjs
 */

import { writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'spiritualrefuge', password: '123456',
    database: 'spiritualrefuge', charset: 'utf8mb4',
  })

  // 所有需要导出的表
  const tables = await conn.query('SHOW TABLES')
  const names = tables[0].map(r => Object.values(r)[0])
    .filter(n => !n.startsWith('analysis_') && !n.startsWith('notes') && !n.startsWith('record_') && !n.startsWith('file_'))

  let sql = `-- 精神避难所 — 数据库导入
-- 生成时间：${new Date().toISOString()}

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

`

  for (const table of names) {
    // CREATE TABLE
    const [createRows] = await conn.query(`SHOW CREATE TABLE \`${table}\``)
    sql += `DROP TABLE IF EXISTS \`${table}\`;\n`
    sql += createRows[0]['Create Table'] + ';\n\n'

    // INSERT data
    const [rows] = await conn.query(`SELECT * FROM \`${table}\``)
    if (rows.length === 0) continue

    const columns = Object.keys(rows[0])
    const values = rows.map(row => {
      const vals = columns.map(col => {
        const v = row[col]
        if (v === null) return 'NULL'
        if (v instanceof Date) return `'${v.toISOString().slice(0, 19).replace('T', ' ')}'`
        if (typeof v === 'string') return `'${v.replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\\/g, '\\\\')}'`
        if (typeof v === 'number') return String(v)
        return `'${String(v)}'`
      })
      return `INSERT INTO \`${table}\` (\`${columns.join('`, `')}\`) VALUES (${vals.join(', ')});`
    }).join('\n')

    sql += values + '\n\n'
  }

  sql += `SET FOREIGN_KEY_CHECKS = 1;\n`

  const outPath = resolve(root, 'db-export.sql')
  writeFileSync(outPath, sql, 'utf8')
  const sizeKB = (Buffer.byteLength(sql) / 1024).toFixed(0)
  console.log(`✅ Exported to db-export.sql (${sizeKB} KB)`)
  await conn.end()
}

main().catch(e => { console.error(e); process.exit(1) })
