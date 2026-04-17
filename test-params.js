const http = require('http');
const https = require('https');
const querystring = require('querystring');

let roomCookie = '';
let loginCookie = '';

function httpReq(targetUrl, method, postData, extraHeaders) {
  return new Promise((resolve, reject) => {
    const pu = new URL(targetUrl);
    const lib = pu.protocol === 'https:' ? https : http;
    const opt = { hostname: pu.hostname, port: pu.port || 443,
      path: pu.pathname + pu.search, method: method || 'GET',
      headers: { 'User-Agent':'Mozilla/5.0','Accept':'*/*','Accept-Language':'zh-CN',
        ...(extraHeaders||{}) }, timeout: 15000 };
    const req = lib.request(opt, res => {
      const sc = res.headers['set-cookie'];
      if (sc) { const c = sc.map(x=>x.split(';')[0]).join('; '); roomCookie = c; }
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject); if (postData) req.write(postData); req.end();
  });
}

async function main() {
  const BASE = 'https://nbqh.lulutong.club';
  
  // Login
  await httpReq(BASE + '/');
  await httpReq(BASE + '/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:'16616135917',UserPass:'135917',_AutoLogin:'1',GoUrl:''});
  const lr = await httpReq(BASE + '/handle/qlogin/', 'POST', pd, {
    'Content-Type':'application/x-www-form-urlencoded','Origin':BASE,
    'Content-Length':Buffer.byteLength(pd),'Cookie':roomCookie
  });
  loginCookie = (lr.status === 200) ? 'ishow=test' : '';
  const fullCookie = roomCookie;
  
  // Test 1: 平仓提醒 without pt (should show latest 10)
  console.log('=== Test 1: PC page 1 (no date filter) ===');
  const r1 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', 'GET', null, {Cookie:fullCookie});
  const li1 = (r1.body.match(/<li>/g)||[]).length;
  const total1 = r1.body.match(/总(\d+)/g);
  console.log('Status:', r1.status, 'LI count:', li1, 'Total:', total1 ? total1.join(', ') : 'none');
  // Extract first and last open time
  const times1 = [...r1.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  console.log('First time:', times1[0]);
  console.log('Last time:', times1[times1.length-1]);

  // Test 2: PC page 2
  console.log('\n=== Test 2: PC page 2 ===');
  const r2 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=2', 'GET', null, {Cookie:fullCookie});
  const times2 = [...r2.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  console.log('First time:', times2[0], 'Last:', times2[times2.length-1]);
  
  // Test 3: PC page 3
  console.log('\n=== Test 3: PC page 3 ===');
  const r3 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=3', 'GET', null, {Cookie:fullCookie});
  const times3 = [...r3.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  console.log('First time:', times3[0], 'Last:', times3[times3.length-1]);

  // Test 4: PC with pt=2026/04/10
  console.log('\n=== Test 4: PC with pt=2026/04/10 ===');
  const r4 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1&pt=2026/04/10', 'GET', null, {Cookie:fullCookie});
  const times4 = [...r4.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  const total4 = r4.body.match(/总(\d+)/g);
  console.log('First time:', times4[0], 'Last:', times4[times4.length-1]);
  console.log('Total:', total4 ? total4.join(', ') : 'none');

  // Test 5: PC with pt=2026/04/01&et=2026/04/05
  console.log('\n=== Test 5: PC with pt=2026/04/01&et=2026/04/05 ===');
  const r5 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1&pt=2026/04/01&et=2026/04/05', 'GET', null, {Cookie:fullCookie});
  const times5 = [...r5.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  const total5 = r5.body.match(/总(\d+)/g);
  console.log('First time:', times5[0], 'Last:', times5[times5.length-1]);
  console.log('Total:', total5 ? total5.join(', ') : 'none');

  // Test 6: PC with pt=2026/03/01
  console.log('\n=== Test 6: PC with pt=2026/03/01 (old date) ===');
  const r6 = await httpReq(BASE + '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1&pt=2026/03/01', 'GET', null, {Cookie:fullCookie});
  const times6 = [...r6.body.matchAll(/class="data2"[^>]*title="([^"]+)"/g)].map(m=>m[1]);
  const total6 = r6.body.match(/总(\d+)/g);
  console.log('First time:', times6[0], 'Last:', times6[times6.length-1]);
  console.log('Total:', total6 ? total6.join(', ') : 'none');

  // Test 7: check what total pages info looks like
  console.log('\n=== Raw HTML snippet (pagination area) ===');
  const pageRe = r1.body.match(/<div class="page">[\s\S]*?<\/div>/);
  if (pageRe) console.log(pageRe[0].substring(0, 500));
  else {
    // Try other patterns
    const pageRe2 = r1.body.match(/共\d+条[\s\S]{0,200}/);
    if (pageRe2) console.log(pageRe2[0]);
    else console.log('No pagination found');
    // Look for any page-related HTML
    const pagerArea = r1.body.match(/<div[^>]*class="[^"]*page[^"]*"[^>]*>[\s\S]{0,500}/);
    if (pagerArea) console.log('\nPager div:', pagerArea[0].substring(0, 300));
  }
}

main().catch(e => console.log('ERR:', e.message));
