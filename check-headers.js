// 通过代理登录后直接用node带cookie访问建仓提醒页面
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
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// 先登录获取cookie，再访问建仓提醒
async function main() {
  // 1. 访问主页拿cookie
  const home = await httpReq('https://nbqh.lulutong.club/', '');
  console.log('Home status:', home.status, 'body len:', home.body.length);
  
  // 2. 登录
  const login = await httpReq(
    'https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199', ''
  );
  console.log('Login status:', login.status, 'body:', login.body.trim());
  
  // 3. 拿到的cookie（手动设置已知cookie）
  const cookie = 'ASPSESSIONIDCCRRBADQ=BNFDLPAACMEFNPABCIGHJJIE';
  
  // 4. 访问建仓提醒页面（classid=8）
  const url = 'https://nbqh.lulutong.club/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1';
  const resp = await httpReq(url, cookie);
  console.log('\n建仓提醒 status:', resp.status);
  if (resp.body.length < 200) {
    console.log('Body:', resp.body);
  } else {
    console.log('Body len:', resp.body.length);
    // 打印前2000字符
    console.log('\n=== FIRST 2000 ===');
    console.log(resp.body.substring(0, 2000));
    // 找所有data*类
    const allData = [...new Set([...resp.body.matchAll(/class="(data\d+)"[^>]*>/g)].map(x => x[1]))];
    console.log('\n=== ALL data CLASSES ===');
    console.log(allData);
    // 找列标题
    const titles = [...resp.body.matchAll(/<span[^>]*data\d+[^>]*>([^<]{2,20})<\/span>/g)].map(x => x[1].trim());
    console.log('\n=== SPAN CONTENTS (potential headers) ===');
    console.log(titles.slice(0, 30));
  }
}

main().catch(e => console.log('ERR:', e.message));
