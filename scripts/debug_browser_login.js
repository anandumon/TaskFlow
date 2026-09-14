const { spawn } = require('child_process');
const http = require('http');
const fs = require('fs');
const path = require('path');
const os = require('os');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const tempDir = path.join(os.tmpdir(), 'tf_chrome_debug_' + Date.now());
fs.mkdirSync(tempDir, { recursive: true });

console.log('Launching headless Chrome...');
const chromeProc = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--no-sandbox',
  '--remote-debugging-port=9222',
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

  let tabs = null;
  for (let i = 0; i < 5; i++) {
    try {
      tabs = await getJson('http://127.0.0.1:9222/json');
      if (tabs && tabs.length > 0) break;
    } catch (e) {
      await sleep(1000);
    }
  }

  if (!tabs || tabs.length === 0) {
    console.error('Could not connect to Chrome CDP on port 9222');
    chromeProc.kill();
    process.exit(1);
  }

  console.log('Found Chrome tabs:', tabs.map(t => ({ title: t.title, url: t.url, id: t.id })));
  const pageTab = tabs.find(t => t.type === 'page' && t.url.includes('3000')) || tabs[0];
  const wsUrl = pageTab.webSocketDebuggerUrl;

  console.log('Connecting to WebSocket:', wsUrl);
  const WebSocket = require(path.join(__dirname, '..', 'apps', 'web', 'node_modules', 'next', 'dist', 'compiled', 'ws'));
  const ws = new WebSocket(wsUrl);

  await new Promise(r => ws.on('open', r));
  console.log('Connected to CDP WebSocket!');

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
  await sendCommand('DOM.enable');

  await sleep(1500);

  // Evaluate DOM checks
  const evalResult = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const googleBtn = document.querySelector('button[type="button"]');
      const signInBtn = document.querySelector('button[type="submit"]');
      const createAccLink = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Create account') || a.href.includes('register'));

      const getInfo = (el, name) => {
        if (!el) return { name, exists: false };
        const rect = el.getBoundingClientRect();
        const topEl = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return {
          name,
          exists: true,
          tagName: el.tagName,
          disabled: el.disabled,
          text: el.innerText,
          rect: { top: rect.top, left: rect.left, width: rect.width, height: rect.height },
          isTopElement: topEl === el || el.contains(topEl),
          topElementTag: topEl ? topEl.tagName + '.' + topEl.className : null
        };
      };

      return {
        url: window.location.href,
        googleBtn: getInfo(googleBtn, 'Google Button'),
        signInBtn: getInfo(signInBtn, 'Sign In Button'),
        createAccLink: getInfo(createAccLink, 'Create Account Link'),
        allButtons: Array.from(document.querySelectorAll('button')).map(b => ({ text: b.innerText, type: b.type, disabled: b.disabled })),
        allInputs: Array.from(document.querySelectorAll('input')).map(i => ({ id: i.id, type: i.type, value: i.value, placeholder: i.placeholder }))
      };
    })()`,
    returnByValue: true
  });

  console.log('\n--- BROWSER DOM EVALUATION RESULT ---');
  console.log(JSON.stringify(evalResult.result.value, null, 2));

  console.log('\n--- BROWSER CONSOLE LOGS ---');
  console.log(JSON.stringify(logs, null, 2));

  // Test clicking Create Account link
  const clickLinkResult = await sendCommand('Runtime.evaluate', {
    expression: `(() => {
      const createAccLink = Array.from(document.querySelectorAll('a')).find(a => a.innerText.includes('Create account') || a.href.includes('register'));
      if (!createAccLink) return 'Create account link not found';
      createAccLink.click();
      return 'Clicked create account link';
    })()`,
    returnByValue: true
  });
  console.log('Click link result:', clickLinkResult.result.value);

  await sleep(1000);

  const afterClickUrl = await sendCommand('Runtime.evaluate', {
    expression: 'window.location.href',
    returnByValue: true
  });
  console.log('URL after clicking Create Account:', afterClickUrl.result.value);

  ws.close();
  chromeProc.kill();
  process.exit(0);
}

main().catch(err => {
  console.error('Debug script error:', err);
  if (chromeProc) chromeProc.kill();
  process.exit(1);
});
