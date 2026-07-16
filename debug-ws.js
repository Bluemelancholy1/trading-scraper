const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const p1 = await browser.newPage();
  const p2 = await browser.newPage();
  p1.on('console', m => console.log('[P1]', m.text()));
  p2.on('console', m => console.log('[P2]', m.text()));
  p1.on('pageerror', e => console.log('[P1-ERR]', e.message));
  p2.on('pageerror', e => console.log('[P2-ERR]', e.message));

  await p1.goto('http://localhost:3456', { waitUntil: 'load' });
  await p2.goto('http://localhost:3456', { waitUntil: 'load' });
  await sleep(1500);

  // 等待 gomoku.js 加载
  await sleep(2000);
  const f1 = await p1.evaluate(() => typeof gomokuCreateRoom);
  const f2 = await p2.evaluate(() => typeof gomokuCreateRoom);
  console.log('gomokuCreateRoom: p1=', f1, 'p2=', f2);

  // 房主：创建房间
  await p1.evaluate(() => { openGomoku(); showGomokuNet(); });
  await p1.evaluate(() => gomokuCreateRoom());
  await sleep(500);
  const room_raw = await p1.evaluate(() => document.getElementById('gomokuRoomCode').textContent);
  const room = room_raw.trim();
  console.log('room_raw=', JSON.stringify(room_raw), 'room=', JSON.stringify(room));

  // P2: 诊断 guest 连接前状态
  await p2.evaluate(() => { openGomoku(); showGomokuNet(); });
  const beforeState = await p2.evaluate(() => ({
    gNetWs: !!gNetWs, gNetConnected: gNetConnected,
    gNetRole: gNetRole, wsReadyState: gNetWs ? gNetWs.readyState : 'null'
  }));
  console.log('P2 连接前:', JSON.stringify(beforeState));

  // P2: 设置 room 并连接
  await p2.evaluate((r) => {
    document.getElementById('gomokuJoinInput').value = r;
    gomokuJoinRoomFromInput();
  }, room);

  // 诊断连接过程（100ms间隔）
  for (let i = 0; i < 30; i++) {
    await sleep(200);
    const state = await p2.evaluate(() => ({
      gNetConnected, gNetRole, gNetMyColor,
      gStarted, gNetWsReadyState: gNetWs ? gNetWs.readyState : 'null',
      gNetWsOpen: gNetWs ? (gNetWs.readyState === 1) : false
    }));
    console.log('P2 t=' + ((i+1)*200) + 'ms:', JSON.stringify(state));
    if (state.gNetConnected && state.gStarted) { console.log('CONNECTED!'); break; }
  }

  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
