const http = require('http');

const BASE_URL = 'http://localhost:8080/api/v1';

function request(path, method = 'GET', data = null, token = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(path.startsWith('http') ? path : `${BASE_URL}${path}`);
    const body = data ? JSON.stringify(data) : null;

    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || 8080,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    };

    const req = http.request(options, (res) => {
      let chunks = '';
      res.on('data', (d) => { chunks += d; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(chunks); } catch (e) { json = { raw: chunks }; }
        resolve({ status: res.statusCode, data: json });
      });
    });

    req.on('error', (e) => reject(e));
    if (body) req.write(body);
    req.end();
  });
}

async function registerAndLogin(name, email, password) {
  console.log(`\n[AUTH] Registering user: ${name} (${email})`);
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'User';

  const reg = await request('/auth/register', 'POST', {
    firstName,
    lastName,
    email,
    password
  });

  if (reg.status !== 201) {
    throw new Error(`Failed to register ${email}: ${reg.status} ${JSON.stringify(reg.data)}`);
  }

  const devCode = reg.data?.data?.devCode || '123456';
  console.log(`[AUTH] Verifying email for ${email} with OTP: ${devCode}`);

  const ver = await request('/auth/verify-email', 'POST', {
    email,
    otp: devCode
  });

  if (ver.status !== 200 || !ver.data?.data?.success) {
    throw new Error(`Failed to verify ${email}: ${ver.status} ${JSON.stringify(ver.data)}`);
  }

  const token = ver.data.data.accessToken;
  const userId = ver.data.data.user.id;
  console.log(`[AUTH] Successfully verified & logged in: ${email} (ID: ${userId})`);
  return { token, userId };
}

async function run() {
  const suffix = Math.random().toString(36).substring(2, 8);
  const aliceEmail = `alice_${suffix}@taskflow.dev`;
  const bobEmail = `bob_${suffix}@taskflow.dev`;
  const password = 'SecurePassword123!';

  console.log('======================================================================');
  console.log('🚀 TASKFLOW MULTI-TENANT AUTHORIZATION & PERMISSION TEST SUITE');
  console.log('======================================================================');

  // 1. Register Alice
  const alice = await registerAndLogin('Alice Admin', aliceEmail, password);

  // 2. Alice creates Organization A
  console.log('\n--- Step 1: Alice creates Organization "Acme Global" ---');
  const orgRes = await request('/organizations', 'POST', { name: 'Acme Global' }, alice.token);
  if (orgRes.status !== 201) throw new Error(`Org creation failed: ${orgRes.status} ${JSON.stringify(orgRes.data)}`);
  const orgAId = orgRes.data.data.id;
  console.log(`✔ Organization A created: ${orgRes.data.data.name} (ID: ${orgAId})`);

  // 3. Alice creates Workspace A
  console.log('\n--- Step 2: Alice creates Workspace "Engineering" in Organization A ---');
  const wsRes = await request(`/organizations/${orgAId}/workspaces`, 'POST', {
    name: 'Engineering',
    description: 'Core engineering workspace',
    color: '#6366F1'
  }, alice.token);
  if (wsRes.status !== 201) throw new Error(`Workspace creation failed: ${wsRes.status}`);
  const wsAId = wsRes.data.data.id;
  console.log(`✔ Workspace A created: ${wsRes.data.data.name} (ID: ${wsAId})`);

  // 4. Alice creates Project A
  console.log('\n--- Step 3: Alice creates Project "Mobile Application" in Workspace A ---');
  const projRes = await request(`/workspaces/${wsAId}/projects`, 'POST', {
    name: 'Mobile Application',
    description: 'iOS and Android client development',
    environments: 'DEV,SIT,UAT,RELEASE,MAIN'
  }, alice.token);
  if (projRes.status !== 201) throw new Error(`Project creation failed: ${projRes.status}`);
  const projAId = projRes.data.data.id;
  console.log(`✔ Project A created: ${projRes.data.data.name} (ID: ${projAId})`);

  // 5. Alice creates Task A
  console.log('\n--- Step 4: Alice creates Task A "Implement Authentication" ---');
  const taskRes = await request(`/workspaces/${wsAId}/tasks`, 'POST', {
    title: 'Implement Authentication',
    description: 'Multi-tenant auth with Google & Supabase',
    status: 'todo',
    environment: 'DEV',
    projectId: projAId
  }, alice.token);
  if (taskRes.status !== 201) throw new Error(`Task creation failed: ${taskRes.status}`);
  const taskAId = taskRes.data.data.id;
  console.log(`✔ Task A created: ${taskRes.data.data.title} (ID: ${taskAId})`);

  // 6. Alice invites Bob to Project A
  console.log(`\n--- Step 5: Alice invites Bob (${bobEmail}) to Project A ---`);
  const inviteRes = await request(`/projects/${projAId}/invitations`, 'POST', {
    email: bobEmail,
    role: 'MEMBER'
  }, alice.token);
  if (inviteRes.status !== 201) throw new Error(`Invite creation failed: ${inviteRes.status}`);
  const invite = inviteRes.data.data;
  const token = invite.token;
  console.log(`✔ Invitation dispatched: Token=${token}, Role=${invite.role}, ExpiresAt=${invite.expiresAt}`);

  // 7. Unauthenticated Token Verification (simulating invite link validation)
  console.log('\n--- Step 6: Public Invitation Token Verification ---');
  const checkInvite = await request(`/invitations/${token}`, 'GET');
  if (checkInvite.status !== 200) throw new Error(`Invite check failed: ${checkInvite.status}`);
  console.log(`✔ Public invite verified: Org='${checkInvite.data.data.orgName}', Workspace='${checkInvite.data.data.workspaceName}', Project='${checkInvite.data.data.projectName}'`);

  // 8. Register Bob
  const bob = await registerAndLogin('Bob Collaborator', bobEmail, password);

  // 9. Bob accepts the invitation
  console.log('\n--- Step 7: Bob accepts Invitation ---');
  const acceptRes = await request(`/invitations/${token}/accept`, 'POST', {}, bob.token);
  if (acceptRes.status !== 200) throw new Error(`Invite acceptance failed: ${acceptRes.status} ${JSON.stringify(acceptRes.data)}`);
  console.log(`✔ Invitation accepted! Bob added to Organization and Workspace.`);

  // 10. Verify Bob can access Organization A & Workspace A & Project A & Task A
  console.log('\n--- Step 8: Bob verifies access to Organization A, Workspace A, Project A, Task A ---');
  const bobOrgs = await request('/organizations', 'GET', null, bob.token);
  const orgIds = bobOrgs.data.data.map(o => o.id);
  if (!orgIds.includes(orgAId)) throw new Error(`Org A not in Bob's org list: ${orgIds}`);
  console.log('✔ Bob can view Organization A in his organization list');

  const bobWs = await request(`/organizations/${orgAId}/workspaces`, 'GET', null, bob.token);
  const wsIds = bobWs.data.data.map(w => w.id);
  if (!wsIds.includes(wsAId)) throw new Error(`Workspace A not in Bob's workspace list: ${wsIds}`);
  console.log('✔ Bob can view Workspace A');

  const bobProj = await request(`/workspaces/${wsAId}/projects`, 'GET', null, bob.token);
  const projIds = bobProj.data.data.map(p => p.id);
  if (!projIds.includes(projAId)) throw new Error(`Project A not in Bob's project list: ${projIds}`);
  console.log('✔ Bob can view Project A');

  const bobTasks = await request(`/projects/${projAId}/tasks`, 'GET', null, bob.token);
  if (!bobTasks.data || !bobTasks.data.data) {
    throw new Error(`Failed to fetch tasks for Bob: status=${bobTasks.status} data=${JSON.stringify(bobTasks.data)}`);
  }
  const taskIds = bobTasks.data.data.map(t => t.id);
  if (!taskIds.includes(taskAId)) throw new Error(`Task A not in Bob's task list: ${taskIds}`);
  console.log('✔ Bob can view Task A');

  // 11. Multi-Tenant Independence: Bob creates his OWN Organization & Workspace
  console.log('\n--- Step 9: Multi-Tenancy: Bob creates his own Organization "Bob Labs" ---');
  const orgBRes = await request('/organizations', 'POST', { name: 'Bob Labs' }, bob.token);
  if (orgBRes.status !== 201) throw new Error(`Bob org creation failed: ${orgBRes.status}`);
  const orgBId = orgBRes.data.data.id;
  console.log(`✔ Organization B created: ${orgBRes.data.data.name} (ID: ${orgBId})`);

  const wsBRes = await request(`/organizations/${orgBId}/workspaces`, 'POST', {
    name: 'Bob Innovation Lab',
    description: "Bob's private R&D lab"
  }, bob.token);
  if (wsBRes.status !== 201) throw new Error(`Bob workspace creation failed: ${wsBRes.status}`);
  const wsBId = wsBRes.data.data.id;
  console.log(`✔ Workspace B created: ${wsBRes.data.data.name} (ID: ${wsBId})`);

  // 12. Security Test: Tenant Isolation (Alice CANNOT access Bob Labs)
  console.log('\n--- Step 10: Security Negative Test: Alice tries to access Bob Labs ---');
  const aliceOrgB = await request(`/organizations/${orgBId}`, 'GET', null, alice.token);
  console.log(`  Alice access to Bob Labs: status=${aliceOrgB.status}, message=${aliceOrgB.data?.error?.message}`);
  if (aliceOrgB.status !== 403) throw new Error(`Expected 403 Forbidden for Alice accessing Bob Labs, got ${aliceOrgB.status}`);
  console.log('✔ Cross-tenant isolation verified: Alice blocked with 403 FORBIDDEN from Bob Labs');

  const aliceWsB = await request(`/organizations/${orgBId}/workspaces`, 'GET', null, alice.token);
  console.log(`  Alice access to Bob Workspaces: status=${aliceWsB.status}, message=${aliceWsB.data?.error?.message}`);
  if (aliceWsB.status !== 403) throw new Error(`Expected 403 Forbidden for Alice listing Bob workspaces, got ${aliceWsB.status}`);
  console.log('✔ Cross-workspace isolation verified: Alice blocked with 403 FORBIDDEN from Bob Workspaces');

  // 13. Admin Removal Scenario: Alice removes Bob from Acme Global
  console.log('\n--- Step 11: Alice removes Bob\'s membership from Organization A ---');
  const membersRes = await request(`/organizations/${orgAId}/members`, 'GET', null, alice.token);
  const bobMember = membersRes.data.data.find(m => m.userId === bob.userId);
  if (!bobMember) throw new Error('Bob not found in Organization A members list');
  console.log(`Found Bob's membership in Org A: Member ID = ${bobMember.id}`);

  const delRes = await request(`/organizations/${orgAId}/members/${bobMember.id}`, 'DELETE', null, alice.token);
  if (delRes.status !== 200) throw new Error(`Failed to remove Bob: ${delRes.status}`);
  console.log(`✔ Alice removed Bob from Organization A`);

  // 14. Immediate Revocation Check for Bob
  console.log('\n--- Step 12: Immediate Revocation Verification for Bob ---');
  const bobOrgCheck = await request(`/organizations/${orgAId}`, 'GET', null, bob.token);
  console.log(`  Bob access to Org A after removal: status=${bobOrgCheck.status}, message=${bobOrgCheck.data?.error?.message}`);
  if (bobOrgCheck.status !== 403) throw new Error(`Expected 403 Forbidden for Bob accessing Org A, got ${bobOrgCheck.status}`);
  console.log('✔ Bob immediately blocked from Organization A: 403 FORBIDDEN');

  const bobWsCheck = await request(`/organizations/${orgAId}/workspaces`, 'GET', null, bob.token);
  console.log(`  Bob access to Org A workspaces after removal: status=${bobWsCheck.status}`);
  if (bobWsCheck.status !== 403) throw new Error(`Expected 403 Forbidden for Bob accessing Org A workspaces, got ${bobWsCheck.status}`);
  console.log('✔ Bob immediately blocked from Org A Workspaces: 403 FORBIDDEN');

  const bobSingleWsCheck = await request(`/workspaces/${wsAId}`, 'GET', null, bob.token);
  console.log(`  Bob access to Workspace A after removal: status=${bobSingleWsCheck.status}`);
  if (bobSingleWsCheck.status !== 403) throw new Error(`Expected 403 Forbidden for Bob accessing Workspace A, got ${bobSingleWsCheck.status}`);
  console.log('✔ Bob immediately blocked from Workspace A: 403 FORBIDDEN');

  // 15. Bob still retains his own independent organization!
  console.log('\n--- Step 13: Bob retains full access to his independent Organization (Bob Labs) ---');
  const bobOrgBCheck = await request(`/organizations/${orgBId}`, 'GET', null, bob.token);
  if (bobOrgBCheck.status !== 200) throw new Error(`Expected 200 OK for Bob accessing Bob Labs, got ${bobOrgBCheck.status}`);
  console.log(`✔ Bob retains full access to '${bobOrgBCheck.data.data.name}' (Status 200 OK)`);

  console.log('\n======================================================================');
  console.log('🎉 ALL 13 MULTI-TENANT COLLABORATION & ISOLATION TESTS PASSED!');
  console.log('======================================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
