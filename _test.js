// Trading Scraper 构建后测试脚本
// 用法: node _test.js
// 全部通过后再上传发布
const http = require('http');
const BASE = 'http://localhost:3456';
const PASS = '135917';

let passed = 0;
let failed = 0;

function test(name, fn, timeoutMs) {
  return new Promise(async (resolve) => {
    const timer = setTimeout(() => {
      console.log('  \x1b[31m\u2716\x1b[0m ' + name + ': timeout');
      failed++;
      resolve(false);
    }, timeoutMs || 10000);
    try {
      await fn();
      clearTimeout(timer);
      console.log('  \x1b[32m\u2714\x1b[0m ' + name);
      passed++;
      resolve(true);
    } catch (e) {
      clearTimeout(timer);
      console.log('  \x1b[31m\u2716\x1b[0m ' + name + ': ' + e.message);
      failed++;
      resolve(false);
    }
  });
}

function fetch(path, opts) {
  opts = opts || {};
  return new Promise((resolve, reject) => {
    const u = new URL(path, BASE);
    const options = {
      hostname: u.hostname, port: u.port,
      path: u.pathname + u.search,
      method: opts.method || 'GET',
      timeout: opts.timeout || 10000,
      headers: { 'Content-Type': 'application/json' }
    };
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body: data }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function main() {
  console.log('\n===== Trading Scraper v1.0.18 测试报告 =====');
  console.log('时间: ' + new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) + '\n');

  // 1. 端口可达
  await test('端口 3456 可达', async () => {
    await fetch('/status', { timeout: 3000 });
  });

  // 2. /status
  await test('GET /status 返回200 + appReady', async () => {
    const r = await fetch('/status');
    if (r.status !== 200) throw new Error('status=' + r.status);
    const j = JSON.parse(r.body);
    if (typeof j.appReady !== 'boolean') throw new Error('appReady missing');
    console.log('    -> ' + JSON.stringify(j));
  });

  // 3. 解锁正确密码
  await test('POST /unlock pw=135917', async () => {
    const r = await fetch('/unlock', { method: 'POST', body: { password: PASS } });
    if (r.status !== 200) throw new Error('status=' + r.status);
    const j = JSON.parse(r.body);
    if (!j.ok) throw new Error(j.error || 'unknown');
    console.log('    -> ' + r.body);
  });

  // 4. 错误密码
  await test('POST /unlock pw=wrong -> 拒绝', async () => {
    const r = await fetch('/unlock', { method: 'POST', body: { password: 'wrong' } });
    const j = JSON.parse(r.body);
    if (j.ok) throw new Error('wrong password should be rejected');
    console.log('    -> ' + r.body);
  });

  // 5. /fetch 数据抓取
  await test('GET /fetch?pages=1 有数据', async () => {
    const r = await fetch('/fetch?pages=1', { timeout: 30000 });
    if (r.status !== 200) throw new Error('status=' + r.status);
    const m = r.body.match(/"rows":(\d+)/);
    if (m) {
      const rows = parseInt(m[1]);
      if (rows === 0) throw new Error('0 rows');
      console.log('    -> ' + rows + ' rows');
    } else {
      const cnt = (r.body.match(/"closeTime"/g) || []).length;
      if (cnt === 0) throw new Error('no records');
      console.log('    -> ' + cnt + ' records');
    }
  });

  // 6. HTML/JS 文件可访问
  const files = [
    ['/index.html', 'index.html', 'text'],
    ['/app.js', 'app.js', 1000],
    ['/lottery.js', 'lottery.js', 100],
    ['/minesweeper.js', 'minesweeper.js', 100]
  ];
  for (const [p, name, minSize] of files) {
    await test('GET ' + name + ' 可访问', async () => {
      const r = await fetch(p);
      if (r.status !== 200) throw new Error(p + ' returned ' + r.status);
      if (typeof minSize === 'number' && r.body.length < minSize) {
        throw new Error(name + ' too short: ' + r.body.length + ' bytes');
      }
      if (typeof minSize === 'number') {
        console.log('    -> ' + r.body.length + ' bytes');
      }
    });
  }

  // 7. app.js 核心函数
  await test('app.js 含核心函数', async () => {
    const r = await fetch('/app.js');
    const required = ['doUnlock', 'showLockScreen', 'showDataScreen', 'init'];
    const missing = required.filter(fn => !r.body.includes(fn));
    if (missing.length > 0) throw new Error('missing: ' + missing.join(', '));
  });

  // 8. lottery.js 抽奖函数
  await test('lottery.js 含抽奖函数', async () => {
    const r = await fetch('/lottery.js');
    if (!r.body.includes('drawLottery') && !r.body.includes('lottery'))
      throw new Error('缺少抽奖函数');
  });

  // 9. minesweeper.js 扫雷函数
  await test('minesweeper.js 含扫雷函数', async () => {
    const r = await fetch('/minesweeper.js');
    if (!r.body.includes('initMine') && !r.body.includes('reveal'))
      throw new Error('缺少扫雷函数');
  });

  // 总结
  const total = passed + failed;
  console.log('\n===== 测试结果 =====');
  if (failed === 0) {
    console.log('\x1b[32m\u2714\u2714\u2714 全部通过 (' + passed + '/' + total + ')，可以上传发布！\x1b[0m');
    process.exit(0);
  } else {
    console.log('\x1b[31m通过: ' + passed + '/' + total + '  失败: ' + failed + '\x1b[0m');
    console.log('\x1b[31m\u2716 有测试失败，请修复后重试\x1b[0m');
    process.exit(1);
  }
}

main().catch(e => {
  console.error('Fatal:', e.message);
  process.exit(1);
});
