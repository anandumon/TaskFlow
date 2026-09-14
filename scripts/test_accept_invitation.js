const http = require('http');

async function request(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(body) }); }
        catch(e) { resolve({ status: res.statusCode, data: body }); }
      });
    });
    req.on('error', reject);
    if (postData) req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    req.end();
  });
}

async function run() {
  console.log('Testing Invitation Acceptance Flow...');

  // 1. Log in as admin
  const adminLogin = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@taskflow.dev', password: 'Admin@TaskFlow2026' });

  const adminToken = adminLogin.data.data.accessToken;

  // 2. Create an invitation to test user 'accept_test@taskflow.dev'
  // Get admin resources
  const resTree = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/me/resources', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + adminToken }
  });
  const projId = resTree.data.data.organizations[0].workspaces[0].projects[0].id;

  const testUserEmail = `invite_accept_test_${Date.now()}@taskflow.dev`;
  console.log('Inviting', testUserEmail, 'to project', projId);

  const inviteRes = await request({
    hostname: 'localhost', port: 8080, path: `/api/v1/projects/${projId}/invitations`, method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + adminToken
    }
  }, {
    email: testUserEmail,
    roleName: 'Project Editor'
  });

  console.log('Invite created:', inviteRes.status, inviteRes.data.data.id, 'Token:', inviteRes.data.data.token);
  const invId = inviteRes.data.data.id;

  // 3. Register and login as testUser
  const regRes = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/auth/register', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testUserEmail,
    password: 'Password123!',
    firstName: 'Invited',
    lastName: 'User'
  });

  const otp = regRes.data.data.devCode;
  await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/auth/verify-email', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, {
    email: testUserEmail,
    code: otp
  });

  const userLogin = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: testUserEmail, password: 'Password123!' });

  const userToken = userLogin.data.data.accessToken;
  console.log('Test user registered, verified, and logged in!');

  // 4. Fetch pending-for-me as test user
  const pendingRes = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/invitations/pending-for-me', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + userToken }
  });

  console.log('User pending invitations:', JSON.stringify(pendingRes.data.data, null, 2));
  const myInvite = pendingRes.data.data[0];
  console.log('myInvite.id:', myInvite.id, 'myInvite.token:', myInvite.token);

  // 5. Accept using myInvite.id (exactly what teams/page.tsx now does!)
  console.log('\n--- Accepting invitation using inv.id (${myInvite.id}) ---');
  const acceptRes = await request({
    hostname: 'localhost', port: 8080, path: `/api/v1/invitations/${myInvite.id}/accept`, method: 'POST',
    headers: { 'Authorization': 'Bearer ' + userToken }
  });

  console.log('Accept Response Status:', acceptRes.status);
  console.log('Accept Response Body:', JSON.stringify(acceptRes.data));

  if (acceptRes.status === 200 && acceptRes.data.success) {
    console.log('🎉 SUCCESS: Invitation successfully accepted via ID without error!');
  } else {
    console.error('❌ FAILED to accept invitation!');
  }
}

run();
