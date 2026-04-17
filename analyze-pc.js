const https = require('https');
const http = require('http');
const querystring = require('querystring');

let roomCookie = '';
let loginCookie = '';

function fetch(url, method, postData, extraHeaders) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const allHeaders = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
      'Referer': 'https://nbqh.lulutong.club/',
      ...extraHeaders,
    };
    const req = lib.request({
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search, method: method || 'GET',
      headers: allHeaders, timeout: 15000,
    }, res => {
      let d = ''; res.on('data', c => d += c);
      res.on('end', () => resolve({
        status: res.statusCode, body: d,
        cookie: res.headers['set-cookie'],
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

async function main() {
  // Room password
  await fetch('https://nbqh.lulutong.club/');
  const r2 = await fetch('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  roomCookie = (r2.cookie||[]).map(c=>c.split(';')[0]).join('; ');
  
  // Account login
  const pd = querystring.stringify({Method:'Login',UserMail:'',usertel:'16616135917',UserPass:'135917',_AutoLogin:'1',GoUrl:''});
  const lr = await fetch('https://nbqh.lulutong.club/handle/qlogin/', 'POST', pd, {
    'Content-Type':'application/x-www-form-urlencoded','Origin':'https://nbqh.lulutong.club',
    'Content-Length':Buffer.byteLength(pd),'Cookie':roomCookie,
  });
  loginCookie = (lr.cookie||[]).map(c=>c.split(';')[0]).join('; ');
  const fullCookie = roomCookie + '; ' + loginCookie;
  console.log('Full cookie:', fullCookie.substring(0, 100));

  // Check all 3 data pages
  const pages = [
    '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000',
    '/generalmodule/shouted/_Data_Ping_Show.asp?classid=8&roomid=7000',
    '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000',
  ];
  
  for (const p of pages) {
    const r = await fetch('https://nbqh.lulutong.club' + p, 'GET', null, {Cookie: fullCookie});
    console.log(`\n${p}`);
    console.log('Status:', r.status, 'Len:', r.body.length);
    
    // Print li items
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    let m, cnt = 0;
    while ((m = liRe.exec(r.body)) !== null && cnt < 3) {
      const clean = m[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`LI#${cnt+1}:`, clean.substring(0, 300));
      cnt++;
    }
    
    // Check for 止损/止盈/获利 in body
    ['止损','止盈','获利','data7','data8','data4','data11'].forEach(kw => {
      console.log(` "${kw}": ${r.body.includes(kw) ? 'YES' : 'NO'}`);
    });
  }
}

main().catch(e => console.log('ERR:', e.message));
