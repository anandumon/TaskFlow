import { Pool } from 'pg'

const connectionString =
  process.env.DATABASE_URL ||
  process.env.DB_URL?.replace('jdbc:postgresql://', 'postgresql://')?.replace('?sslmode=require&prepareThreshold=0', '') ||
  'postgresql://postgres.dxrcfczdfstnymbeicmq:KKZjGoDBMRWaq7H4@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

const globalForPg = global as unknown as { pgPool: Pool | undefined }

export const db =
  globalForPg.pgPool ||
  new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    idleTimeoutMillis: 30000,
  })

if (process.env.NODE_ENV !== 'production') {
  globalForPg.pgPool = db
}

export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const res = await db.query(text, params)
  return res.rows
}

export async function queryOne<T = any>(text: string, params: any[] = []): Promise<T | null> {
  const res = await db.query(text, params)
  return res.rows[0] || null
}
