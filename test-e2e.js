const http = require('http');

const BACKEND_URL = 'http://localhost:8080';
const FRONTEND_URL = 'http://localhost:3000';

let testResults = [];
let passCount = 0;
let failCount = 0;

function request(url, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const reqOptions = {
      hostname: u.hostname,
      port: u.port,
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {})
      }
    };

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ status: res.statusCode, data: parsed, raw: data });
        } catch (e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function record(name, category, passed, details = '') {
  if (passed) passCount++;
  else failCount++;
  testResults.push({ name, category, status: passed ? 'PASS' : 'FAIL', details });
  console.log(`${passed ? '✔ PASS' : '✖ FAIL'}: [${category}] ${name} ${details ? '(' + details + ')' : ''}`);
}

async function runAllTests() {
  console.log('\n================================================================');
  console.log('🚀 TASKFLOW END-TO-END AUTOMATED VERIFICATION SUITE');
  console.log('================================================================\n');

  let adminToken = '';
  let adminRefreshToken = '';
  let adminUserId = '';
  let secondaryToken = '';
  let secondaryUserId = '';
  let orgId = '';
  let workspaceId = '';
  let teamId = '';

  // ─────────────────────────────────────────────────────────────
  // 1. AUTHENTICATION & IDENTITY
  // ─────────────────────────────────────────────────────────────
  try {
    // Test 1: Admin Login
    const r1 = await request(`${BACKEND_URL}/api/v1/auth/login`, { method: 'POST' }, {
      email: 'admin@taskflow.dev',
      password: 'admin'
    });
    const p1 = r1.status === 200 && r1.data?.data?.accessToken;
    if (p1) {
      adminToken = r1.data.data.accessToken;
      adminRefreshToken = r1.data.data.refreshToken;
      adminUserId = r1.data.data.user.id;
    }
    record('Admin Login (admin@taskflow.dev / admin)', 'Auth', p1, `HTTP ${r1.status}`);

    // Test 2: Verify /auth/me
    const r2 = await request(`${BACKEND_URL}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Verify Current User (/auth/me)', 'Auth', r2.status === 200 && r2.data?.data?.email === 'admin@taskflow.dev', `HTTP ${r2.status}`);

    // Test 3: Register Secondary User
    const testEmail = `developer_${Date.now()}@taskflow.dev`;
    const r3 = await request(`${BACKEND_URL}/api/v1/auth/register`, { method: 'POST' }, {
      firstName: 'Sarah',
      lastName: 'Connor',
      email: testEmail,
      password: 'StrongPassword123'
    });
    const p3 = r3.status === 201 && r3.data?.data?.accessToken;
    if (p3) {
      secondaryToken = r3.data.data.accessToken;
      secondaryUserId = r3.data.data.user.id;
    }
    record('Register New User', 'Auth', p3, `Email: ${testEmail}`);

    // Test 4: Duplicate Email Conflict Detection
    const r4 = await request(`${BACKEND_URL}/api/v1/auth/register`, { method: 'POST' }, {
      firstName: 'Duplicate',
      lastName: 'User',
      email: testEmail,
      password: 'StrongPassword123'
    });
    record('Prevent Duplicate Registration (409 Conflict)', 'Auth', r4.status === 409, `HTTP ${r4.status}`);

    // Test 5: Refresh Token Rotation
    const r5 = await request(`${BACKEND_URL}/api/v1/auth/refresh`, { method: 'POST' }, {
      refreshToken: adminRefreshToken
    });
    record('JWT Refresh Token Rotation', 'Auth', r5.status === 200 && r5.data?.data?.accessToken, `HTTP ${r5.status}`);
    if (r5.data?.data?.accessToken) {
      adminToken = r5.data.data.accessToken;
    }

    // Test 6: User Profile Update
    const r6 = await request(`${BACKEND_URL}/api/v1/users/me`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      jobTitle: 'Chief System Architect',
      department: 'Core Infrastructure'
    });
    record('Update User Profile', 'Identity', r6.status === 200 && r6.data?.data?.jobTitle === 'Chief System Architect', `HTTP ${r6.status}`);

    // Test 7: Change Password
    const r7 = await request(`${BACKEND_URL}/api/v1/users/me/password`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${secondaryToken}` }
    }, {
      currentPassword: 'StrongPassword123',
      newPassword: 'NewSecurePassword456'
    });
    record('Change User Password', 'Identity', r7.status === 200, `HTTP ${r7.status}`);

  } catch (e) {
    record('Auth flow exception', 'Auth', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. ORGANIZATION MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  try {
    // Test 8: List Organizations
    const r8 = await request(`${BACKEND_URL}/api/v1/organizations`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const p8 = r8.status === 200 && Array.isArray(r8.data?.data) && r8.data.data.length > 0;
    if (p8) {
      // Find TaskFlow HQ or first org
      const foundOrg = r8.data.data.find((o) => o.slug === 'taskflow-hq') || r8.data.data[0];
      orgId = foundOrg.id;
    }
    record('List User Organizations', 'Organization', p8, `Found ${r8.data?.data?.length || 0} orgs`);

    // Test 9: Create Custom Organization
    const randomSuffix = Date.now().toString().slice(-4);
    const r9 = await request(`${BACKEND_URL}/api/v1/organizations`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: `Stark Industries ${randomSuffix}`
    });
    const expectedSlug = `stark-industries-${randomSuffix}`;
    const p9 = r9.status === 201 && r9.data?.data?.slug === expectedSlug;
    record('Create Organization (Auto slug)', 'Organization', p9, `Slug: ${r9.data?.data?.slug}`);

    // Test 10: Get Organization by ID
    const r10 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Get Organization by ID', 'Organization', r10.status === 200 && r10.data?.data?.id === orgId, `Org: ${r10.data?.data?.name}`);

    // Test 11: Update Organization
    const r11 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'TaskFlow Enterprise HQ'
    });
    record('Update Organization', 'Organization', r11.status === 200 && r11.data?.data?.name === 'TaskFlow Enterprise HQ', `HTTP ${r11.status}`);

    // Test 12: List Organization Members
    const r12 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('List Organization Members', 'Organization', r12.status === 200 && Array.isArray(r12.data?.data), `Members: ${r12.data?.data?.length}`);

    // Test 13: Add Member to Organization
    if (secondaryUserId) {
      const r13 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      }, {
        userId: secondaryUserId,
        roleId: 'a0000000-0000-0000-0000-000000000004'
      });
      record('Add Member to Organization', 'Organization', r13.status === 201, `HTTP ${r13.status}`);
    }
  } catch (e) {
    record('Organization flow exception', 'Organization', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 3. WORKSPACE MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  try {
    // Test 14: List Workspaces for Org
    const r14 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}/workspaces`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const p14 = r14.status === 200 && Array.isArray(r14.data?.data) && r14.data.data.length > 0;
    if (p14) {
      workspaceId = r14.data.data[0].id;
    }
    record('List Workspaces in Org', 'Workspace', p14, `Workspaces: ${r14.data?.data?.length || 0}`);

    // Test 15: Create New Workspace
    const r15 = await request(`${BACKEND_URL}/api/v1/organizations/${orgId}/workspaces`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Mobile Client Engineering',
      description: 'iOS and Android native apps',
      color: '#EC4899',
      icon: 'smartphone'
    });
    const p15 = r15.status === 201 && r15.data?.data?.name === 'Mobile Client Engineering';
    record('Create Workspace (Branding & Icons)', 'Workspace', p15, `Color: ${r15.data?.data?.color}`);
    if (p15) workspaceId = r15.data.data.id;

    // Test 16: Get Workspace by ID
    const r16 = await request(`${BACKEND_URL}/api/v1/workspaces/${workspaceId}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('Get Workspace by ID', 'Workspace', r16.status === 200 && r16.data?.data?.id === workspaceId, `Name: ${r16.data?.data?.name}`);

    // Test 17: Update Workspace
    const r17 = await request(`${BACKEND_URL}/api/v1/workspaces/${workspaceId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Mobile Core & Platforms'
    });
    record('Update Workspace', 'Workspace', r17.status === 200 && r17.data?.data?.name === 'Mobile Core & Platforms', `HTTP ${r17.status}`);

    // Test 18: List Workspace Members
    const r18 = await request(`${BACKEND_URL}/api/v1/workspaces/${workspaceId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('List Workspace Members', 'Workspace', r18.status === 200 && Array.isArray(r18.data?.data), `Members: ${r18.data?.data?.length}`);

  } catch (e) {
    record('Workspace flow exception', 'Workspace', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. TEAM MANAGEMENT
  // ─────────────────────────────────────────────────────────────
  try {
    // Test 19: Create Team
    const r19 = await request(`${BACKEND_URL}/api/v1/workspaces/${workspaceId}/teams`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Frontend Guild',
      description: 'Next.js, Tailwind, Design System tokens',
      color: '#8B5CF6',
      icon: 'layout'
    });
    const p19 = r19.status === 201 && r19.data?.data?.name === 'Frontend Guild';
    if (p19) teamId = r19.data.data.id;
    record('Create Team in Workspace', 'Team', p19, `Team: ${r19.data?.data?.name}`);

    // Test 20: List Teams
    const r20 = await request(`${BACKEND_URL}/api/v1/workspaces/${workspaceId}/teams`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('List Teams in Workspace', 'Team', r20.status === 200 && Array.isArray(r20.data?.data), `Teams: ${r20.data?.data?.length}`);

    // Test 21: Update Team
    const r21 = await request(`${BACKEND_URL}/api/v1/teams/${teamId}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` }
    }, {
      name: 'Frontend & Design System Guild'
    });
    record('Update Team Details', 'Team', r21.status === 200 && r21.data?.data?.name === 'Frontend & Design System Guild', `HTTP ${r21.status}`);

    // Test 22: Add Member to Team
    if (secondaryUserId) {
      const r22 = await request(`${BACKEND_URL}/api/v1/teams/${teamId}/members`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${adminToken}` }
      }, {
        userId: secondaryUserId
      });
      record('Add Member to Team', 'Team', r22.status === 201, `HTTP ${r22.status}`);
    }

    // Test 23: List Team Members
    const r23 = await request(`${BACKEND_URL}/api/v1/teams/${teamId}/members`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    record('List Team Members', 'Team', r23.status === 200 && Array.isArray(r23.data?.data), `Members: ${r23.data?.data?.length}`);

  } catch (e) {
    record('Team flow exception', 'Team', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 5. SECURITY, TENANCY & RBAC
  // ─────────────────────────────────────────────────────────────
  try {
    // Test 24: Unauthorized Access Blocked
    const r24 = await request(`${BACKEND_URL}/api/v1/organizations`);
    record('Block Unauthenticated Request (401)', 'Security', r24.status === 401, `HTTP ${r24.status}`);

    // Test 25: Swagger API Docs Accessible
    const r25 = await request(`${BACKEND_URL}/api/docs`);
    record('Swagger OpenAPI Specs (/api/docs)', 'Security', r25.status === 200, `HTTP ${r25.status}`);

    // Test 26: Actuator Health Endpoint
    const r26 = await request(`${BACKEND_URL}/actuator/health`);
    record('Actuator Health Endpoint (/actuator/health)', 'Security', r26.status === 200, `HTTP ${r26.status}`);

    // Test 27: Logout Session
    const r27 = await request(`${BACKEND_URL}/api/v1/auth/logout`, {
      method: 'POST'
    }, {
      refreshToken: adminRefreshToken
    });
    record('Logout Session', 'Security', r27.status === 200, `HTTP ${r27.status}`);

  } catch (e) {
    record('Security flow exception', 'Security', false, e.message);
  }

  // ─────────────────────────────────────────────────────────────
  // 6. FRONTEND PAGES & ROUTES
  // ─────────────────────────────────────────────────────────────
  const frontendPages = [
    { path: '/', label: 'Root Landing Page' },
    { path: '/login', label: 'Login Screen' },
    { path: '/register', label: 'Register Screen' },
    { path: '/onboarding', label: 'Onboarding Wizard' },
    { path: '/app/home', label: 'Dashboard / Overview' },
    { path: '/app/tasks', label: 'Tasks & Kanban' },
    { path: '/app/projects', label: 'Projects Directory' },
    { path: '/app/teams', label: 'Teams & Members' },
    { path: '/app/analytics', label: 'Analytics & Sprints' },
    { path: '/app/settings', label: 'Workspace Settings' },
  ];

  for (const page of frontendPages) {
    try {
      const res = await request(`${FRONTEND_URL}${page.path}`);
      record(`Page: ${page.label} (${page.path})`, 'Frontend', res.status === 200, `HTTP ${res.status}`);
    } catch (e) {
      record(`Page: ${page.label} (${page.path})`, 'Frontend', false, e.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // SUMMARY REPORT
  // ─────────────────────────────────────────────────────────────
  console.log('\n================================================================');
  console.log(`📊 TEST EXECUTION SUMMARY: ${passCount}/${passCount + failCount} PASSED (${Math.round((passCount / (passCount + failCount)) * 100)}%)`);
  console.log('================================================================\n');

  if (failCount > 0) {
    console.error(`❌ ${failCount} test(s) failed.`);
    process.exit(1);
  } else {
    console.log(`🎉 ALL ${passCount} TESTS PASSED SUCCESSFULLY! Everything is functioning as expected.`);
  }
}

runAllTests();
