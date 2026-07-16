const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const http = require('http');
function post(path) {
  return new Promise((res, rej) => {
    const req = http.request({ host: 'localhost', port: 3456, path, method: 'POST', timeout: 5000 }, x => {
      let d = ''; x.on('data', c => d += c); x.on('end', () => res(JSON.parse(d)));
    });
    req.on('error', rej); req.write('{}'); req.end();
  });
}

(async () => {
  // 确保 proxy 运行
  let proxyOk = false;
  try { await post('/status'); proxyOk = true; } catch(e) {}
  if (!proxyOk) {
    console.log('Starting proxy...');
    const { spawn } = require('child_process');
    spawn('C:\\Program Files\\nodejs\\node.exe', ['proxy-server.js'], {
      cwd: 'C:\\Users\\chen\\.qclaw\\workspace\\trading-scraper',
      env: { ...process.env, NODE_PATH: 'C:\\Users\\chen\\.qclaw\\workspace\\trading-scraper\\node_modules' },
      stdio: ['ignore', 'pipe', 'pipe']
    });
    await sleep(5000);
  }

  const roomData = await post('/gomoku/host');
  console.log('WS:', roomData.room);

  // 先创建所有页面，在 navigate 前注册 console handler
  const [b1, b2] = await Promise.all([
    puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] }),
    puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] })
  ]);
  const [p1, p2] = await Promise.all([b1.newPage(), b2.newPage()]);

  // ⚠️ 在 navigate 前注册 console 监听
  p1.on('console', m => { if (!m.text().includes('[DOM]')) console.log('[p1]', m.text().slice(0, 200)); });
  p2.on('console', m => { if (!m.text().includes('[DOM]')) console.log('[p2]', m.text().slice(0, 200)); });

  await Promise.all([
    p1.goto('http://localhost:3456', { waitUntil: 'load' }),
    p2.goto('http://localhost:3456', { waitUntil: 'load' })
  ]);
  await sleep(2000);

  // 注入调试日志到 onNetMessage（确保追踪到 hello 到达）
  await p1.evaluate(() => {
    const orig = onNetMessage;
    onNetMessage = function(data) {
      console.log('[DBG] p1 onNetMessage:', data.slice(0, 100));
      return orig(data);
    };
  });
  await p2.evaluate(() => {
    const orig = onNetMessage;
    onNetMessage = function(data) {
      console.log('[DBG] p2 onNetMessage:', data.slice(0, 100));
      return orig(data);
    };
  });

  // p1 = host
  await p1.evaluate(() => { openGomoku(); showGomokuNet(); gomokuCreateRoom(); });
  await sleep(1500);

  // p2 = guest
  const room = roomData.room;
  await p2.evaluate(() => { openGomoku(); showGomokuNet(); });
  await sleep(300);
  // 6位数字加入需要先有 localStorage 记忆
  await p2.evaluate((r) => {
    localStorage.setItem('gomokuLastHostWsUrl', 'ws://localhost:3460');
    document.getElementById('gomokuJoinInput').value = r;
    gomokuJoinRoomFromInput();
  }, room);
  await sleep(3000);

  const s1 = await p1.evaluate(() => ({ gNetConnected, gNetRole, gNetMyColor, gStarted }));
  const s2 = await p2.evaluate(() => ({ gNetConnected, gNetRole, gNetMyColor, gStarted }));
  console.log('\nHost:', JSON.stringify(s1));
  console.log('Guest:', JSON.stringify(s2));

  if (s1.gNetConnected && s2.gNetConnected) {
    await p1.evaluate(() => startNetGame());
    await sleep(500);
    await p1.evaluate(() => { commitMove(7, 7, 1); gNetWs.send(JSON.stringify({ t: 'move', r: 7, c: 7, player: 1 })); });
    await sleep(500);
    await p2.evaluate(() => { commitMove(7, 8, 2); gNetWs.send(JSON.stringify({ t: 'move', r: 7, c: 8, player: 2 })); });
    await sleep(500);
    const [bd1, bd2] = await Promise.all([
      p1.evaluate(() => ({ b77: gBoard[7][7], b78: gBoard[7][8], cur: gCurrent })),
      p2.evaluate(() => ({ b77: gBoard[7][7], b78: gBoard[7][8], cur: gCurrent }))
    ]);
    console.log('Board p1:', JSON.stringify(bd1));
    console.log('Board p2:', JSON.stringify(bd2));
    const ok = bd1.b77 === 1 && bd1.b78 === 2 && bd2.b77 === 1 && bd2.b78 === 2;
    console.log(ok ? '\n✅ PASS' : '\n❌ FAIL');
  } else {
    console.log('\n❌ Not connected');
  }

  await b1.close();
  await b2.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
