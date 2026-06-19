/**
 * 首页种子脚本 — 名言 + 好歌
 * 从 xlsx 导入到 home_quotes / home_songs
 *
 * 用法：node scripts/seed-home.mjs
 */

import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

async function main() {
  const XLSX = await import('xlsx')

  const conn = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'spiritualrefuge', password: '123456',
    database: 'spiritualrefuge', charset: 'utf8mb4',
  })

  try {
    // ========== 名言 ==========
    const qwb = XLSX.default.readFile(resolve(root, '名言短句内容库_100条.xlsx'))
    const qws = qwb.Sheets[qwb.SheetNames[0]]
    const qdata = XLSX.default.utils.sheet_to_json(qws, { header: 1 })
    const quotes = qdata.slice(3).filter(r => r[0] && r[0].toString().trim())

    // 清旧
    await conn.query('DELETE FROM home_quotes')
    let qi = 0
    for (const row of quotes) {
      const text = (row[0] || '').toString().trim().slice(0, 50)
      const author = (row[1] || '').toString().trim().slice(0, 50)
      const isActive = (row[5] || '').toString().trim() === '是'
      if (!text) continue
      await conn.query(
        'INSERT INTO home_quotes (text, author, is_enabled, sort_order) VALUES (?, ?, ?, ?)',
        [text, author, isActive ? 1 : 0, qi++],
      )
    }
    console.log(`[seed] ✅ ${qi} quotes imported`)

    // ========== 好歌 ==========
    const swb = XLSX.default.readFile(resolve(root, '好歌推荐内容库_100首.xlsx.xlsx'))
    const sws = swb.Sheets[swb.SheetNames[0]]
    const sdata = XLSX.default.utils.sheet_to_json(sws, { header: 1 })
    const songs = sdata.slice(3).filter(r => r[0] && r[0].toString().trim())

    await conn.query('DELETE FROM home_songs')
    let si = 0
    for (const row of songs) {
      const title = (row[0] || '').toString().trim().slice(0, 100)
      const artist = (row[1] || '').toString().trim().slice(0, 100)
      const reason = (row[2] || '').toString().trim().slice(0, 50)
      const mood = (row[5] || row[3] || '').toString().trim().slice(0, 50)
      const isActive = (row[6] || '').toString().trim() === '是'
      if (!title) continue
      await conn.query(
        'INSERT INTO home_songs (title, artist, reason, suitable_mood, is_enabled, sort_order) VALUES (?, ?, ?, ?, ?, ?)',
        [title, artist, reason, mood, isActive ? 1 : 0, si++],
      )
    }
    console.log(`[seed] ✅ ${si} songs imported`)

  } catch (err) {
    console.error('[seed] ❌ Failed:', err.message)
    process.exit(1)
  } finally {
    await conn.end()
  }
}

main()
