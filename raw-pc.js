const https = require('https');
const http = require('http');
const querystring = require('querystring');

let roomCookie = '';
let loginCookie = '';

function fetch(url, method, postData, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search, method: method || 'GET',
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Referer': 'https://nbqh.lulutong.club/', ...extraHeaders },
      timeout: 15000,
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d, cookie: res.headers['set-cookie'] }));
    });
    req.on('error', reject); req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  await fetch('https://nbqh.lulutong.club/');
  const r2 = await fetch('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  roomCookie = (r2.cookie||[]).map(c=>c.split(';')[0]).join('; ');
  const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:'16616135917',UserPass:'135917',_AutoLogin:'1',GoUrl:''});
  const lr = await fetch('https://nbqh.lulutong.club/handle/qlogin/', 'POST', pd, {
    'Content-Type':'application/x-www-form-urlencoded','Origin':'https://nbqh.lulutong.club','Content-Length':Buffer.byteLength(pd),'Cookie':roomCookie,
  });
  loginCookie = (lr.cookie||[]).map(c=>c.split(';')[0]).join('; ');
  const fullCookie = roomCookie + '; ' + loginCookie;

  // Full analysis of 平仓 page
  const r = await fetch('https://nbqh.lulutong.club/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000', 'GET', null, {Cookie: fullCookie});
  
  // Print raw LI HTML for first 3 items
  const liRe = /<li>([\s\S]*?)<\/li>/g;
  let m, cnt = 0;
  while ((m = liRe.exec(r.body)) !== null && cnt < 3) {
    console.log(`\n=== RAW LI #${cnt+1} ===`);
    console.log(m[1]);
    cnt++;
  }
  
  // Analyze column headers
  const headers = r.body.match(/<div class="title">([\s\S]*?)<\/div>/);
  if (headers) {
    console.log('\n=== HEADERS ===');
    console.log(headers[1]);
  }
  
  // Check data7, data8 in raw HTML
  console.log('\n=== Searching all data fields in raw HTML ===');
  ['data1','data2','data3','data4','data5','data6','data7','data8','data9','data10','data11','data12'].forEach(d => {
    const idx = r.body.indexOf('class="' + d + '"');
    if (idx >= 0) {
      const ctx = r.body.substring(idx, idx + 200).replace(/\n/g, ' ');
      console.log(`${d}: "${ctx.substring(0,180)}"`);
    }
  });
  
  fs = require('fs');
  fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pingcang-raw.html', r.body);
  console.log('\nSaved full page to pingcang-raw.html');
}

main().catch(e => console.log('ERR:', e.message));
