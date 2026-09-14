const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = body ? JSON.parse(body) : {};
          resolve({ status: res.statusCode, headers: res.headers, data: json });
        } catch (e) {
          resolve({ status: res.statusCode, headers: res.headers, data: body });
        }
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function run() {
  console.log('🚀 Starting Verification for All 4 Email Dispatch Flows...\n');

  // 1. TEST OTP EMAIL (Registering new user triggers 6-digit OTP verification email)
  console.log('--- TEST 1: OTP Verification Email Dispatch ---');
  const testEmail = `anandu2109+test${Date.now()}@gmail.com`;
  try {
    const registerRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/register',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: testEmail,
      password: 'Password123!',
      firstName: 'Anandu',
      lastName: 'Tester'
    });

    console.log('Register Response Status:', registerRes.status);
    console.log('Register Response Body:', JSON.stringify(registerRes.data));
  } catch (e) {
    console.error('Registration OTP Error:', e);
  }

  // 2. Authenticate as Admin to test authenticated email actions
  console.log('\n--- Logging in as Admin to obtain JWT ---');
  let token = '';
  try {
    const loginRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/auth/login',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }, {
      email: 'admin@taskflow.dev',
      password: 'Admin@TaskFlow2026'
    });

    if (loginRes.data && loginRes.data.data && loginRes.data.data.accessToken) {
      token = loginRes.data.data.accessToken;
      console.log('Admin login successful!');
    } else {
      console.error('Failed to log in as admin:', loginRes.data);
      return;
    }
  } catch (e) {
    console.error('Admin Login Error:', e);
    return;
  }

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  };

  // Get resources tree for Admin
  let workspaceId = '';
  let projectId = '';
  try {
    const treeRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: '/api/v1/me/resources',
      method: 'GET',
      headers: authHeaders
    });

    const tree = treeRes.data.data;
    if (tree && tree.organizations && tree.organizations.length > 0) {
      const org = tree.organizations[0];
      if (org.workspaces && org.workspaces.length > 0) {
        const ws = org.workspaces[0];
        workspaceId = ws.id;
        console.log(`Found Workspace: "${ws.name}" (${ws.id})`);
        if (ws.projects && ws.projects.length > 0) {
          projectId = ws.projects[0].id;
          console.log(`Found Project: "${ws.projects[0].name}" (${projectId})`);
        }
      }
    }
  } catch (e) {
    console.error('Failed to get resources:', e);
  }

  if (!workspaceId) {
    console.error('Could not resolve workspaceId from /api/v1/me/resources');
    return;
  }

  // If no project exists yet in this workspace, create one
  if (!projectId) {
    console.log('Creating project in workspace ' + workspaceId);
    const projRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/workspaces/${workspaceId}/projects`,
      method: 'POST',
      headers: authHeaders
    }, {
      name: 'Email Test Project',
      description: 'Project created for email verification audit'
    });

    if (projRes.data && projRes.data.data) {
      projectId = projRes.data.data.id;
      console.log('Created Project:', projectId, projRes.data.data.name);
    } else {
      console.error('Failed to create project:', projRes.data);
      return;
    }
  }

  // 3. TEST PROJECT INVITATION EMAIL
  console.log('\n--- TEST 2: Project Invitation Email Dispatch ---');
  try {
    const inviteRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/projects/${projectId}/invitations`,
      method: 'POST',
      headers: authHeaders
    }, {
      email: 'anandu2109@gmail.com',
      roleName: 'MEMBER'
    });
    console.log('Project Invitation Status:', inviteRes.status);
    console.log('Project Invitation Response:', JSON.stringify(inviteRes.data));
  } catch (e) {
    console.error('Project Invitation Error:', e);
  }

  // 4. TEST SINGLE TASK DUE ALERT EMAIL
  console.log('\n--- TEST 3: Single Task Due Alert Email Dispatch ---');
  let taskId = '';
  try {
    const today = new Date().toISOString().split('T')[0];
    const createTaskRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/workspaces/${workspaceId}/tasks`,
      method: 'POST',
      headers: authHeaders
    }, {
      title: 'Complete Final Email SMTP Audit',
      description: 'Verify live transmission of all emails in TaskFlow',
      projectId: projectId,
      dueDate: today,
      priority: 'HIGH',
      status: 'in-progress'
    });

    if (createTaskRes.data && createTaskRes.data.data) {
      taskId = createTaskRes.data.data.id;
      console.log('Created test task for due alert:', taskId);

      // Trigger due alert for this single task
      const singleAlertRes = await request({
        hostname: 'localhost',
        port: 8080,
        path: `/api/v1/tasks/${taskId}/due-alert`,
        method: 'POST',
        headers: authHeaders
      });
      console.log('Single Task Due Alert Status:', singleAlertRes.status);
      console.log('Single Task Due Alert Response:', JSON.stringify(singleAlertRes.data));
    } else {
      console.error('Failed to create task:', createTaskRes.data);
    }
  } catch (e) {
    console.error('Single Task Due Alert Error:', e);
  }

  // 5. TEST BULK / DATE DUE ALERT DIGEST
  console.log('\n--- TEST 4: Date Due Alert Digest Email Dispatch ---');
  try {
    const today = new Date().toISOString().split('T')[0];
    const digestRes = await request({
      hostname: 'localhost',
      port: 8080,
      path: `/api/v1/workspaces/${workspaceId}/tasks/due-alerts/dispatch-date?date=${today}&email=anandu2109@gmail.com`,
      method: 'POST',
      headers: authHeaders
    });
    console.log('Date Due Alert Digest Status:', digestRes.status);
    console.log('Date Due Alert Digest Response:', JSON.stringify(digestRes.data));
  } catch (e) {
    console.error('Date Due Alert Digest Error:', e);
  }

  console.log('\nWaiting 15 seconds for all async SMTP transmissions to complete...');
  await sleep(15000);
  console.log('Verification run complete!');
}

run();
