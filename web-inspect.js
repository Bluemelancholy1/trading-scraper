// 通过浏览器抓取（xbrowser）查看平仓提醒页面的完整结构
// 需要访问 https://nbqh.lulutong.club 并登录，然后导航到平仓页面

// 写一个诊断脚本，尝试所有可能的平仓提醒相关URL
const http = require('http');
const https = require('https');

function httpReq(url, cookie) {
  return new Promise((resolve, reject) => {
    const pu = new URL(url);
    const lib = pu.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search, method: 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36', 'Cookie': cookie || '' },
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

  // 尝试 _Data_Ping_Show 完整页面（带pt参数能筛选日期）
  const r = await httpReq(base + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&pt=2026/04/10&page=1', cookie);
  console.log('Full page status:', r.status, 'len:', r.body.length);
  console.log('First 3000:', r.body.substring(0, 3000));
}

main().catch(e => console.log('ERR:', e.message));
