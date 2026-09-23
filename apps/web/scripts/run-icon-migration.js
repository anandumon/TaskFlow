const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.dxrcfczdfstnymbeicmq:KKZjGoDBMRWaq7H4@aws-0-ap-south-1.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function run() {
  try {
    console.log('Running 003_alter_projects_icon_text migration...');
    const sqlPath = path.join(__dirname, '../src/server/db/migrations/003_alter_projects_icon_text.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('projects.icon converted to TEXT successfully.');

    const res = await pool.query(
      `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'icon'`
    );
    console.log('Updated column:', res.rows[0]);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
