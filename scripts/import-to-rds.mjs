/**
 * 导入 SQL 到阿里云 RDS
 * 用法：node scripts/import-to-rds.mjs <RDS密码>
 */

import { readFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import mysql from 'mysql2/promise'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')

const PASSWORD = process.argv[2]
if (!PASSWORD) {
  console.log('用法：node scripts/import-to-rds.mjs <RDS密码>')
  process.exit(1)
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'rm-2vc8ocf5g9gh54wfwxo.mysql.cn-chengdu.rds.aliyuncs.com',
    port: 3306,
    user: 'm0nesy',
    password: PASSWORD,
    charset: 'utf8mb4',
    multipleStatements: true,
  })

  console.log('✅ 已连接 RDS')

  // 重建数据库
  await conn.query('DROP DATABASE IF EXISTS sp')
  await conn.query('CREATE DATABASE sp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await conn.query('USE sp')
  console.log('✅ 数据库 sp 已重建')

  // 整体导入
  const sql = readFileSync(resolve(root, 'db-export.sql'), 'utf8')
  console.log(`📄 正在导入 ${(sql.length / 1024).toFixed(0)} KB ...`)
  await conn.query(sql)
  console.log('✅ 导入成功')

  await conn.end()
}

main().catch(e => {
  console.error('❌', e.message)
  process.exit(1)
})
