const { Pool } = require('pg')

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.dxrcfczdfstnymbeicmq:KKZjGoDBMRWaq7H4@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

async function run() {
  try {
    console.log('[Migration] Creating user_terms_acceptance table...')

    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_terms_acceptance (
          user_id                 VARCHAR(255) PRIMARY KEY,
          status                  VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'ACCEPTED', 'DECLINED')),
          accepted_at             TIMESTAMP WITH TIME ZONE,
          declined_at             TIMESTAMP WITH TIME ZONE,
          ip_address              VARCHAR(100),
          user_agent              TEXT,
          created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_terms_status ON user_terms_acceptance(user_id, status);
    `)

    console.log('[Migration] user_terms_acceptance table successfully created or already exists.')
  } catch (err) {
    console.error('[Migration Error]:', err)
  } finally {
    await pool.end()
  }
}

run()
