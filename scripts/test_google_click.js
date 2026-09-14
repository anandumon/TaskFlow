const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'tf_chrome_debug_google_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9223',
  `--user-data-dir=${tempDir}`,
  'http://localhost:3000/login'
], { stdio: 'ignore' });

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    http.get(url, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); } catch(e) { resolve(null); }
      });
    }).on('error', reject);
  });
}

async function main() {
  await sleep(2500);
  const tabs = await getJson('http://127.0.0.1:9223/json');
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('3000')) || tabs[0];
  const wsUrl = pageTab.webSocketDebuggerUrl;

  const WebSocket = require(path.join(__dirname, '..', 'apps', 'web', 'node_modules', 'next', 'dist', 'compiled', 'ws'));
  const ws = new WebSocket(wsUrl);
  await new Promise(r => ws.on('open', r));

  let msgId = 1;
  function sendCommand(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = msgId++;
      const handler = (data) => {
        const msg = JSON.parse(data);
        if (msg.id === id) {
          ws.off('message', handler);
          if (msg.error) reject(msg.error);
          else resolve(msg.result);
        }
      };
      ws.on('message', handler);
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  const logs = [];
  ws.on('message', (d) => {
    const msg = JSON.parse(d);
    if (msg.method === 'Runtime.consoleAPICalled') {
      logs.push({ type: msg.params.type, args: msg.params.args.map(a => a.value || a.description) });
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      logs.push({ type: 'EXCEPTION', exception: msg.params.exceptionDetails });
    }
  });

  await sendCommand('Runtime.enable');
  await sendCommand('Page.enable');
  await sendCommand('Log.enable');

  console.log('Navigating to http://localhost:3000/login with error listeners active...');
  await sendCommand('Page.navigate', { url: 'http://localhost:3000/login' });

  await sleep(3000);

  console.log('Inspecting script tags...');
  const scriptsCheck = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const scripts = Array.from(document.querySelectorAll('script')).map(s => ({
        src: s.src,
        async: s.async,
        defer: s.defer,
        type: s.type
      }));
      return {
        scripts,
        readyState: document.readyState
      };
    })()`,
    returnByValue: true
  });
  console.log('Scripts check:', JSON.stringify(scriptsCheck.result.value, null, 2));

  await sleep(3000);

  const afterClickUrl = await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  console.log('URL 3s after clicking Google Button:', afterClickUrl.result.value);

  console.log('Logs captured:', JSON.stringify(logs, null, 2));

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error(err);
  if (chromeProc) chromeProc.kill();
  process.exit(1);
});
