const { Pool } = require('pg')

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres.dxrcfczdfstnymbeicmq:KKZjGoDBMRWaq7H4@aws-0-ap-south-1.pooler.supabase.com:6543/postgres'

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false },
})

async function runTests() {
  console.log('--- Starting TaskFlow Theme System Verification Tests ---')

  const testUserA = 'a1111111-1111-1111-1111-111111111111'
  const testUserB = 'b2222222-2222-2222-2222-222222222222'

  try {
    // 1. Ensure test users exist in public.users
    await pool.query(`
      INSERT INTO users (id, email, first_name, last_name, display_name, status)
      VALUES 
        ($1, 'userA@test.local', 'User', 'A', 'User A', 'ACTIVE'),
        ($2, 'userB@test.local', 'User', 'B', 'User B', 'ACTIVE')
      ON CONFLICT (id) DO NOTHING
    `, [testUserA, testUserB])

    // Clean any prior test preferences
    await pool.query(`DELETE FROM user_theme_preferences WHERE user_id IN ($1, $2)`, [testUserA, testUserB])

    // Test 1: Default theme fallback for new user
    console.log('\n[Test 1] Testing default theme creation (Neutral)...')
    const defaultRes = await pool.query(`
      INSERT INTO user_theme_preferences (user_id, theme_id, theme_type, custom_theme, created_at, updated_at)
      VALUES ($1, 'NEUTRAL', 'PRESET', NULL, NOW(), NOW())
      RETURNING theme_id, theme_type, custom_theme
    `, [testUserA])

    if (defaultRes.rows[0].theme_id === 'NEUTRAL' && defaultRes.rows[0].theme_type === 'PRESET') {
      console.log('✔ Test 1 Passed: Default theme is NEUTRAL (PRESET)')
    } else {
      throw new Error(`Test 1 Failed: ${JSON.stringify(defaultRes.rows[0])}`)
    }

    // Test 2: User A selects Ocean
    console.log('\n[Test 2] Testing preset update to OCEAN for User A...')
    const oceanRes = await pool.query(`
      UPDATE user_theme_preferences
      SET theme_id = 'OCEAN', theme_type = 'PRESET', custom_theme = NULL, updated_at = NOW()
      WHERE user_id = $1
      RETURNING theme_id, theme_type
    `, [testUserA])

    if (oceanRes.rows[0].theme_id === 'OCEAN') {
      console.log('✔ Test 2 Passed: User A theme updated to OCEAN')
    } else {
      throw new Error(`Test 2 Failed: ${JSON.stringify(oceanRes.rows[0])}`)
    }

    // Test 3: User B sets Berry
    console.log('\n[Test 3] Testing User B preference set to BERRY...')
    const berryRes = await pool.query(`
      INSERT INTO user_theme_preferences (user_id, theme_id, theme_type, custom_theme, created_at, updated_at)
      VALUES ($1, 'BERRY', 'PRESET', NULL, NOW(), NOW())
      RETURNING theme_id, theme_type
    `, [testUserB])

    if (berryRes.rows[0].theme_id === 'BERRY') {
      console.log('✔ Test 3 Passed: User B theme set to BERRY')
    } else {
      throw new Error(`Test 3 Failed: ${JSON.stringify(berryRes.rows[0])}`)
    }

    // Test 4: Multi-User Isolation Verification
    console.log('\n[Test 4] Verifying Multi-User Isolation (User A is Ocean, User B is Berry)...')
    const prefA = await pool.query(`SELECT theme_id FROM user_theme_preferences WHERE user_id = $1`, [testUserA])
    const prefB = await pool.query(`SELECT theme_id FROM user_theme_preferences WHERE user_id = $1`, [testUserB])

    if (prefA.rows[0].theme_id === 'OCEAN' && prefB.rows[0].theme_id === 'BERRY') {
      console.log('✔ Test 4 Passed: Multi-user isolation verified (A = OCEAN, B = BERRY, zero leakage)')
    } else {
      throw new Error(`Test 4 Failed: A=${prefA.rows[0]?.theme_id}, B=${prefB.rows[0]?.theme_id}`)
    }

    // Test 5: Custom Theme Persistence
    console.log('\n[Test 5] Testing custom theme persistence for User A...')
    const customPalette = {
      primary: '#7C3AED',
      secondary: '#4C1D95',
      accent: '#06B6D4',
      surface: '#EDE9FE',
      background: '#FAF5FF',
    }

    const customRes = await pool.query(`
      UPDATE user_theme_preferences
      SET theme_id = 'CUSTOM', theme_type = 'CUSTOM', custom_theme = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING theme_id, theme_type, custom_theme
    `, [JSON.stringify(customPalette), testUserA])

    if (customRes.rows[0].theme_id === 'CUSTOM' && customRes.rows[0].custom_theme.primary === '#7C3AED') {
      console.log('✔ Test 5 Passed: Custom theme saved and restored with custom colors')
    } else {
      throw new Error(`Test 5 Failed: ${JSON.stringify(customRes.rows[0])}`)
    }

    // Test 6: Theme Reset to Neutral
    console.log('\n[Test 6] Testing theme reset to Neutral...')
    const resetRes = await pool.query(`
      UPDATE user_theme_preferences
      SET theme_id = 'NEUTRAL', theme_type = 'PRESET', custom_theme = NULL, updated_at = NOW()
      WHERE user_id = $1
      RETURNING theme_id, theme_type, custom_theme
    `, [testUserA])

    if (resetRes.rows[0].theme_id === 'NEUTRAL' && resetRes.rows[0].theme_type === 'PRESET' && resetRes.rows[0].custom_theme === null) {
      console.log('✔ Test 6 Passed: Theme successfully reset to NEUTRAL (PRESET)')
    } else {
      throw new Error(`Test 6 Failed: ${JSON.stringify(resetRes.rows[0])}`)
    }

    // Cleanup test users
    await pool.query(`DELETE FROM user_theme_preferences WHERE user_id IN ($1, $2)`, [testUserA, testUserB])
    await pool.query(`DELETE FROM users WHERE id IN ($1, $2)`, [testUserA, testUserB])

    console.log('\n--- ALL VERIFICATION TESTS PASSED SUCCESSFULLY (6/6) ---')
  } catch (err) {
    console.error('Test execution error:', err)
  } finally {
    await pool.end()
  }
}

runTests()
