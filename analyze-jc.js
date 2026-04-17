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
    const opt = {
      hostname: u.hostname, port: u.port || 443,
      path: u.pathname + u.search,
      method: method || 'GET',
      headers: allHeaders,
      timeout: 15000,
    };
    const req = lib.request(opt, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({
        status: res.statusCode, body: d,
        cookie: res.headers['set-cookie'],
        location: res.headers['location'],
      }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('timeout')); });
    if (postData) req.write(postData);
    req.end();
  });
}

function getFullCookie() {
  const parts = [];
  if (roomCookie) parts.push(roomCookie);
  if (loginCookie) parts.push(loginCookie);
  return parts.join('; ');
}

async function main() {
  // Step 1: Room password
  await fetch('https://nbqh.lulutong.club/');
  const r2 = await fetch('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  roomCookie = (r2.cookie || []).map(c => c.split(';')[0]).join('; ');

  // Step 2: Login
  const postData = querystring.stringify({
    Method: 'Login', UserMail: '', usertel: '16616135917',
    UserPass: '135917', _AutoLogin: '1', GoUrl: '',
  });
  const lr = await fetch('https://nbqh.lulutong.club/handle/qlogin/', 'POST', postData, {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Origin': 'https://nbqh.lulutong.club',
    'Content-Length': Buffer.byteLength(postData),
    'Cookie': roomCookie,
  });
  loginCookie = (lr.cookie || []).map(c => c.split(';')[0]).join('; ');
  console.log('Login cookie:', loginCookie);

  const cookie = getFullCookie();

  // Step 3: Fetch 建仓提醒 page
  const jc = await fetch('https://nbqh.lulutong.club/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000', 'GET', null, { Cookie: cookie });
  console.log('建仓提醒 status:', jc.status, 'len:', jc.body.length);
  
  // Save full HTML
  require('fs').writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/jc-page.html', jc.body);
  console.log('Saved to jc-page.html');
  
  // Analyze all data fields (li elements)
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/g;
  let m, count = 0;
  while ((m = liRe.exec(jc.body)) !== null && count < 5) {
    console.log(`\n=== LI #${count+1} ===`);
    console.log(m[1].trim().substring(0, 500));
    count++;
  }
  
  // Find all data class references
  const dataClasses = ['data1','data2','data3','data4','data5','data6','data7','data8','data9','data10','data11','data12','data13','data14'];
  dataClasses.forEach(dc => {
    const idx = jc.body.indexOf(dc);
    if (idx >= 0) {
      const ctx = jc.body.substring(Math.max(0, idx-50), idx+200);
      console.log(`\n${dc}: found at ${idx}`);
      console.log('Context:', ctx.replace(/\n/g,' ').trim().substring(0, 200));
    } else {
      console.log(`${dc}: NOT FOUND`);
    }
  });
  
  // Look for 止 / 损 / 盈 keywords
  ['止损', '止盈', '获利', '止损价', '止盈价'].forEach(kw => {
    const idx = jc.body.indexOf(kw);
    if (idx >= 0) {
      const ctx = jc.body.substring(Math.max(0, idx-100), idx+200);
      console.log(`\n"${kw}": found`);
      console.log('Context:', ctx.replace(/\n/g,' ').trim().substring(0, 300));
    } else {
      console.log(`"${kw}": NOT FOUND`);
    }
  });
}

main().catch(e => console.log('ERR:', e.message));
