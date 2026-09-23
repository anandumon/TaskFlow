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
    console.log('Running 002_add_username_unique_to_users migration...');
    const sqlPath = path.join(__dirname, '../src/server/db/migrations/002_add_username_unique_to_users.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    await pool.query(sql);
    console.log('Migration executed successfully.');

    const res = await pool.query(`SELECT id, email, username, first_name FROM users LIMIT 10`);
    console.log('Users with username:', res.rows);
  } catch (err) {
    console.error('Migration error:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

run();
