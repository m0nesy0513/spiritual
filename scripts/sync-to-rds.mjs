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

  await remote.query('SET FOREIGN_KEY_CHECKS = 0')
  await remote.query('DROP DATABASE IF EXISTS sp')
  await remote.query('CREATE DATABASE sp CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci')
  await remote.query('USE sp')
  console.log('✅ 远程库 sp 已重建')

  const tables = await local.query('SHOW TABLES')
  const names = tables[0].map(r => Object.values(r)[0])
  console.log(`📋 ${names.length} 个表待同步`)

  for (const table of names) {
    const cr = await local.query(`SHOW CREATE TABLE \`${table}\``)
    await remote.query(cr[0][0]['Create Table'])
    console.log(`  📦 ${table} 表结构 ✅`)

    const rows = await local.query(`SELECT * FROM \`${table}\``)
    if (rows[0].length === 0) continue

    const cols = Object.keys(rows[0][0])
    const values = rows[0].map(r => cols.map(c => r[c] ?? null))
    // 每 200 行一批
    for (let i = 0; i < values.length; i += 200) {
      const batch = values.slice(i, i + 200)
      const ph = cols.map(() => '?').join(',')
      const rowPh = `(${ph})`
      const sql = `INSERT INTO \`${table}\` (\`${cols.join('`, `')}\`) VALUES ${batch.map(() => rowPh).join(',')}`
      await remote.query(sql, batch.flat())
    }
    console.log(`  📦 ${table} ${values.length} 行 ✅`)
  }

  console.log('\n🎉 同步完成')
  await local.end()
  await remote.end()
}

main().catch(e => { console.error('❌', e.message); process.exit(1) })
