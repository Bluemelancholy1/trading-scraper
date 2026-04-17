// 探测所有ASP数据接口
const http = require('http');
const https = require('https');

function httpReq(url, cookie) {
  return new Promise((resolve, reject) => {
    const pu = new URL(url);
    const lib = pu.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie || '' },
      timeout: 15000
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  const base = 'https://nbqh.lulutong.club';
  const cookie = 'ASPSESSIONIDCCRRBADQ=BNFDLPAACMEFNPABCIGHJJIE';

  const pages = [
    // 建仓/喊单相关
    '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1',
    '/generalmodule/shouted/_data_start_show.asp?classid=1&roomid=7000&page=1',
    '/generalmodule/shouted/_data_start_show.asp?classid=2&roomid=7000&page=1',
    // 平仓页 - 看有没有额外参数能返回data4/7/8
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&1=1&page=1',
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&showall=1&page=1',
    // 独立API接口
    '/generalmodule/shouted/GetPingList.asp?roomid=7000&page=1',
    '/generalmodule/shouted/GetStartList.asp?roomid=7000&page=1',
    '/handle/GetData.asp?roomid=7000&type=ping',
    '/Handle/ShoutedList.asp?roomid=7000&page=1',
  ];

  for (const p of pages) {
    try {
      const r = await httpReq(base + p, cookie);
      const hasLi = r.body.includes('<li>');
      const dataClasses = [...new Set([...r.body.matchAll(/class="(data\d+)"[^>]*>/g)].map(x => x[1]))];
      const isMemberBlock = r.body.includes('请注册会员');
      const hasJson = r.body.trim().startsWith('{') || r.body.trim().startsWith('[');
      console.log(`[${r.status}] ${p}`);
      if (isMemberBlock) { console.log('  → 会员限制'); }
      else if (hasLi) { console.log('  → 有数据, fields:', dataClasses); }
      else if (hasJson) { console.log('  → JSON:', r.body.substring(0, 200)); }
      else { console.log('  → 空/未知, len:', r.body.length); }
    } catch(e) {
      console.log(`[ERR] ${p}: ${e.message}`);
    }
  }
}

main().catch(e => console.log('FATAL:', e.message));
