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
  const adminLogin = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/auth/login', method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  }, { email: 'admin@taskflow.dev', password: 'Admin@TaskFlow2026' });

  const token = adminLogin.data.data.accessToken;
  console.log('Admin logged in!');

  // Check what pending-for-me returns for admin
  const adminInvs = await request({
    hostname: 'localhost', port: 8080, path: '/api/v1/invitations/pending-for-me', method: 'GET',
    headers: { 'Authorization': 'Bearer ' + token }
  });
  console.log('Admin pending invitations:', JSON.stringify(adminInvs.data, null, 2));
}

run();
