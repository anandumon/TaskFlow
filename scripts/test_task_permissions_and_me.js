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

async function registerAndLogin(name, email, password = 'SecurePassword123!') {
  const [firstName, ...rest] = name.split(' ');
  const lastName = rest.join(' ') || 'User';

  const regRes = await request('/auth/register', 'POST', {
    email,
    password,
    firstName,
    lastName
  });
  if (regRes.status !== 201) {
    throw new Error(`Registration failed for ${email}: ${regRes.status} ${JSON.stringify(regRes.data)}`);
  }

  const devCode = regRes.data?.data?.devCode || '123456';
  const verifyRes = await request('/auth/verify-email', 'POST', { email, otp: devCode });
  if (verifyRes.status !== 200) throw new Error(`OTP verification failed: ${verifyRes.status} ${JSON.stringify(verifyRes.data)}`);

  return {
    userId: verifyRes.data.data.user.id,
    token: verifyRes.data.data.accessToken,
    email
  };
}

async function run() {
  console.log('======================================================================');
  console.log('🎯 TASKFLOW TASK-LEVEL PERMISSION & /ME/RESOURCES TEST SUITE');
  console.log('======================================================================\n');

  const rand = Math.random().toString(36).substring(7);
  const alice = await registerAndLogin('Alice Manager', `alice_${rand}@taskflow.dev`);
  const bob = await registerAndLogin('Bob Developer', `bob_${rand}@taskflow.dev`);

  // 1. Alice creates Org, Workspace, Project
  const orgRes = await request('/organizations', 'POST', { name: 'Dev Team' }, alice.token);
  const orgId = orgRes.data.data.id;

  const wsRes = await request(`/organizations/${orgId}/workspaces`, 'POST', { name: 'Sprint 1' }, alice.token);
  const wsId = wsRes.data.data.id;

  const projRes = await request(`/workspaces/${wsId}/projects`, 'POST', { name: 'Backend Services' }, alice.token);
  const projId = projRes.data.data.id;

  // 2. Alice creates Task 1 (assigned to Alice) and Task 2 (assigned to Bob)
  const task1Res = await request(`/workspaces/${wsId}/tasks`, 'POST', {
    projectId: projId,
    title: "Alice's Core Architecture Task",
    assigneeId: alice.userId,
    status: 'todo'
  }, alice.token);
  const task1Id = task1Res.data.data.id;
  console.log(`✔ Task 1 created (Assigned to Alice): ID=${task1Id}`);

  const task2Res = await request(`/workspaces/${wsId}/tasks`, 'POST', {
    projectId: projId,
    title: "Bob's Feature Implementation Task",
    assigneeId: bob.userId,
    status: 'todo'
  }, alice.token);
  const task2Id = task2Res.data.data.id;
  console.log(`✔ Task 2 created (Assigned to Bob): ID=${task2Id}`);

  // 3. Alice invites Bob as Project Viewer
  const invRes = await request(`/projects/${projId}/invitations`, 'POST', {
    email: bob.email,
    role: 'Project Viewer'
  }, alice.token);
  const token = invRes.data.data.token;
  console.log(`✔ Alice invited Bob to Project: Token=${token}`);

  // 4. Bob accepts
  const acceptRes = await request(`/invitations/${token}/accept`, 'POST', null, bob.token);
  if (acceptRes.status !== 200) throw new Error(`Accept failed: ${acceptRes.status}`);
  console.log('✔ Bob accepted invitation to Project');

  // 5. Test /api/v1/me/resources for Bob
  console.log('\n--- Checking GET /api/v1/me/resources for Bob ---');
  const meRes = await request('/me/resources', 'GET', null, bob.token);
  if (meRes.status !== 200) throw new Error(`/me/resources failed: ${meRes.status}`);
  const userTree = meRes.data.data;
  console.log(`✔ User resource tree retrieved: ${userTree.organizations.length} org(s)`);
  const userOrg = userTree.organizations.find(o => o.id === orgId);
  if (!userOrg) throw new Error('Org not in Bob /me/resources tree');
  const userWs = userOrg.workspaces.find(w => w.id === wsId);
  if (!userWs) throw new Error('Workspace not in Bob /me/resources tree');
  const userProj = userWs.projects.find(p => p.id === projId);
  if (!userProj) throw new Error('Project not in Bob /me/resources tree');
  console.log(`✔ /me/resources properly mapped hierarchical structure: Org -> Workspace -> Project`);

  // 6. Test /api/v1/me/permissions for Bob
  console.log('\n--- Checking GET /api/v1/me/permissions for Bob ---');
  const permsRes = await request(`/me/permissions?projectId=${projId}`, 'GET', null, bob.token);
  if (permsRes.status !== 200) throw new Error(`/me/permissions failed: ${permsRes.status}`);
  const perms = permsRes.data.data.projectPermissions || [];
  console.log(`✔ Bob effective project permissions: ${perms.length} codes (${perms.slice(0, 5).join(', ')}...)`);
  if (!perms.includes('PROJECT_VIEW') && !perms.includes('project.view')) {
    throw new Error('Bob lacks PROJECT_VIEW in effective permissions');
  }

  // 7. Bob views project tasks: Can view ALL tasks in project
  console.log('\n--- Checking Bob can view all tasks in the project ---');
  const tasksRes = await request(`/projects/${projId}/tasks`, 'GET', null, bob.token);
  if (tasksRes.status !== 200) throw new Error(`Bob get tasks failed: ${tasksRes.status}`);
  const taskIds = tasksRes.data.data.map(t => t.id);
  if (!taskIds.includes(task1Id) || !taskIds.includes(task2Id)) {
    throw new Error(`Bob cannot view all tasks: found ${taskIds}`);
  }
  console.log('✔ Bob can view both Task 1 (Alice) and Task 2 (Bob)');

  // 8. Bob attempts to edit Alice's task -> MUST BE 403 FORBIDDEN
  console.log('\n--- Testing Bob CANNOT edit Alice\'s task ---');
  const editAliceTask = await request(`/tasks/${task1Id}`, 'PATCH', {
    title: 'Tampered by Bob'
  }, bob.token);
  console.log(`  Bob edit Task 1 status: ${editAliceTask.status}, message=${editAliceTask.data?.error?.message}`);
  if (editAliceTask.status !== 403) {
    throw new Error(`Expected 403 Forbidden when editing unassigned task, got ${editAliceTask.status}`);
  }
  console.log('✔ Security verified: Bob blocked with 403 FORBIDDEN from editing Alice\'s task');

  // 9. Bob edits his OWN task (assigned to Bob) -> MUST BE 200 OK
  console.log('\n--- Testing Bob CAN edit task assigned to him ---');
  const editBobTask = await request(`/tasks/${task2Id}`, 'PATCH', {
    title: "Bob's Updated Task Title",
    status: 'in_progress'
  }, bob.token);
  if (editBobTask.status !== 200) {
    throw new Error(`Expected 200 OK when editing assigned task, got ${editBobTask.status}: ${JSON.stringify(editBobTask.data)}`);
  }
  console.log(`✔ Bob successfully edited his assigned task (Status 200 OK, title='${editBobTask.data.data.title}')`);

  // 10. Bob attempts to delete his task -> MUST BE 403 FORBIDDEN (Viewers/Editors cannot delete tasks)
  console.log('\n--- Testing Bob CANNOT delete tasks ---');
  const delBobTask = await request(`/tasks/${task2Id}`, 'DELETE', null, bob.token);
  console.log(`  Bob delete Task 2 status: ${delBobTask.status}, message=${delBobTask.data?.error?.message}`);
  if (delBobTask.status !== 403) {
    throw new Error(`Expected 403 Forbidden when deleting task, got ${delBobTask.status}`);
  }
  console.log('✔ Security verified: Bob blocked with 403 FORBIDDEN from deleting tasks');

  console.log('\n======================================================================');
  console.log('🎉 ALL TASK-LEVEL GRANULAR PERMISSION & RESOURCE TESTS PASSED!');
  console.log('======================================================================');
}

run().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
