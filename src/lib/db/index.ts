import mysql from 'mysql2/promise'

let pool: mysql.Pool | null = null

function getPool(): mysql.Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '3306', 10),
      user: process.env.DATABASE_USER || 'spiritualrefuge',
      password: process.env.DATABASE_PASSWORD || '',
      database: process.env.DATABASE_NAME || 'spiritualrefuge',
      charset: 'utf8mb4',
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      // 连接超时 10 秒
      connectTimeout: 10_000,
      // 空闲连接 60 秒后回收
      idleTimeout: 60_000,
      // 每 30 秒 ping 一次保活
      enableKeepAlive: true,
      keepAliveInitialDelay: 30_000,
    })

    // 监听连接池错误
    ;(pool as any).on('error', (err: any) => {
      if (err.fatal) {
        console.error('[DB] Fatal pool error, resetting pool:', err.message)
        pool = null
      }
    })
  }
  return pool
}

/** 执行单条查询 */
export async function query<T>(sql: string, params?: unknown[]): Promise<T[]> {
  try {
    const [rows] = await getPool().query(sql, params)
    return rows as T[]
  } catch (err: any) {
    if (err?.code === 'ECONNRESET' || err?.fatal) {
      pool = null // 下次重建
    }
    throw err
  }
}

/** 执行 INSERT/UPDATE/DELETE */
export async function execute(sql: string, params?: unknown[]): Promise<any> {
  try {
    const [result] = await getPool().execute(sql, params as any)
    return result
  } catch (err: any) {
    if (err?.code === 'ECONNRESET' || err?.fatal) {
      pool = null
    }
    throw err
  }
}

/** 执行事务 */
export async function transaction<T>(fn: (conn: mysql.PoolConnection) => Promise<T>): Promise<T> {
  const conn = await getPool().getConnection()
  try {
    await conn.beginTransaction()
    const result = await fn(conn)
    await conn.commit()
    return result
  } catch (error: any) {
    await conn.rollback()
    if (error?.code === 'ECONNRESET' || error?.fatal) pool = null
    throw error
  } finally {
    conn.release()
  }
}

export default getPool
