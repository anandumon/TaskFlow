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
    console.log('Running user_theme_preferences migration...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_theme_preferences (
          id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id         UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          theme_id        VARCHAR(50) NOT NULL DEFAULT 'NEUTRAL',
          theme_type      VARCHAR(20) NOT NULL DEFAULT 'PRESET',
          custom_theme    JSONB DEFAULT NULL,
          created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_theme_preferences_user_id ON user_theme_preferences(user_id);
    `)
    console.log('Migration executed successfully.')

    const res = await pool.query(`SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'user_theme_preferences'`)
    console.log('Columns in user_theme_preferences:', res.rows)
  } catch (err) {
    console.error('Migration error:', err)
  } finally {
    await pool.end()
  }
}

run()
