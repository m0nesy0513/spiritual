/**
 * 直接从本地数据库同步到阿里云 RDS
 * 用法：node scripts/sync-to-rds.mjs <RDS密码>
 */

import mysql from 'mysql2/promise'

const PASSWORD = process.argv[2]
if (!PASSWORD) { console.log('用法：node scripts/sync-to-rds.mjs <RDS密码>'); process.exit(1) }

async function main() {
  const local = await mysql.createConnection({
    host: 'localhost', port: 3306, user: 'spiritualrefuge', password: '123456',
    database: 'spiritualrefuge', charset: 'utf8mb4',
  })
  const remote = await mysql.createConnection({
    host: 'rm-2vc8ocf5g9gh54wfwxo.mysql.cn-chengdu.rds.aliyuncs.com',
    port: 3306, user: 'm0nesy', password: PASSWORD,
    charset: 'utf8mb4', multipleStatements: true,
  })

  console.log('✅ 两端已连接')

  // 重建远程库
  await remote.query('DROP DATABASE IF EXISTS sp')
  await remote.query('CREATE DATABASE sp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await remote.query('USE sp')
  console.log('✅ 远程库 sp 已重建')

  // 获取所有表
  const [tables] = await local.query('SHOW TABLES')
  const names = tables.map((r: any) => Object.values(r)[0])
  console.log(`📋 ${names.length} 个表待同步`)

  for (const table of names) {
    // 建表
    const [cr] = await local.query(`SHOW CREATE TABLE \`${table}\``)
    await remote.query((cr[0] as any)['Create Table'])
    console.log(`  📦 ${table} 表结构 ✅`)

    // 导数据（每次 500 行）
    const [rows] = await local.query(`SELECT * FROM \`${table}\``)
    if (rows.length === 0) continue

    const cols = Object.keys((rows as any)[0])
    const placeholders = cols.map(() => '?').join(',')
    const insertSQL = `INSERT INTO \`${table}\` (\`${cols.join('`, `')}\`) VALUES (${placeholders})`

    for (let i = 0; i < (rows as any[]).length; i += 500) {
      const batch = (rows as any[]).slice(i, i + 500).map(r => cols.map(c => r[c] ?? null))
      await remote.query(insertSQL, batch as any)  // bulk insert
    }
    console.log(`  📦 ${table} ${(rows as any[]).length} 行 ✅`)
  }

  console.log('\n🎉 同步完成')
  await local.end()
  await remote.end()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
