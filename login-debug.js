// 调试：用当前proxy服务器的session cookie来访问所有可能的数据接口
const http = require('http');
const https = require('https');

function httpReq(url, cookie) {
  return new Promise((resolve, reject) => {
    const pu = new URL(url);
    const lib = pu.protocol === 'https:' ? https : http;
    const opt = {
      hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': '*/*', 'Cookie': cookie || '' },
      timeout: 15000
    };
    const req = lib.request(opt, res => {
      // 收集所有Set-Cookie
      const setCookies = res.headers['set-cookie'];
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, setCookies }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const base = 'https://nbqh.lulutong.club';
  
  // 1. 主页
  const r1 = await httpReq(base + '/', '');
  console.log('1. 主页:', r1.status, 'setCookie:', r1.setCookies);
  
  // 2. 登录
  const r2 = await httpReq(base + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199', '');
  console.log('2. 登录:', r2.status, 'body:', r2.body.trim(), 'setCookie:', r2.setCookies);
  
  // 从r2的set-cookie提取session
  let sc = '';
  if (r2.setCookies) {
    sc = r2.setCookies.map(c => c.split(';')[0]).join('; ');
    console.log('   完整Cookie:', sc);
  }
  
  // 3. 用拿到的cookie访问建仓提醒
  const r3 = await httpReq(base + '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1', sc);
  console.log('3. 建仓提醒:', r3.status, r3.body.substring(0, 150));
  if (r3.setCookies) {
    console.log('   setCookie:', r3.setCookies);
    // 用新的cookie
    const sc2 = r3.setCookies.map(c => c.split(';')[0]).join('; ');
    const r4 = await httpReq(base + '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1', sc2);
    console.log('4. 建仓提醒(retry):', r4.status, r4.body.substring(0, 150));
  }
  
  // 4. 试其他可能的页面
  const pages = [
    '/generalmodule/shouted/_data_start_show.asp?classid=7&roomid=7000&page=1', // 平仓？
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
    '/generalmodule/shouted/shouted.asp?roomid=7000',
    '/generalmodule/shouted/shouted_list.asp?roomid=7000',
  ];
  
  for (const p of pages) {
    const r = await httpReq(base + p, sc);
    const hasLi = r.body.includes('<li>');
    const hasData = [...r.body.matchAll(/class="(data\d+)"/g)].map(x=>x[1]);
    console.log('PAGE:', p, '→ status:', r.status, 'hasLi:', hasLi, 'dataClasses:', [...new Set(hasData)].slice(0,15));
    if (hasLi) {
      const m = r.body.match(/<li>([\s\S]*?)<\/li>/g);
      if (m) console.log('  FIRST LI:', m[0].substring(0, 500));
    }
  }
}

main().catch(e => console.log('ERR:', e.message));
