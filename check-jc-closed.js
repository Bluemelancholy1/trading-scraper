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

  // Get ALL pages of 建仓提醒
  const allRows = [];
  let page = 1;
  while (page <= 5) { // Get first 5 pages = 50 records
    const params = new URLSearchParams({ roomid: '7000', page: String(page) });
    const r = await fetch('https://nbqh.lulutong.club/generalmodule/shouted/_data_start_show.asp?' + params, 'GET', null, {Cookie: fullCookie});
    
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m, cnt = 0;
    while ((m = re.exec(r.body)) !== null) {
      const li = m[1];
      const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
      const openTime   = get(/class="data2"[^>]*title="([^"]+)"/);
      const direction  = get(/class="data3"[^>]*title="([^"]+)"/);
      const product    = get(/class="data5"[^>]*title="([^"]+)"/);
      const openPrice  = get(/class="data6"[^>]*title="([^"]+)"/);
      const stopLoss   = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g,' ');
      const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g,' ');
      const teacher    = get(/class="data9"[^>]*title="([^"]+)"/);
      
      // data10 span: may contain close info (title=closeTime, input value=closePrice)
      const data10Full = li.match(/class="data10"[\s\S]*?<\/span>/);
      let closeTime = '', closePrice = '', profitPts = '';
      if (data10Full) {
        const d10 = data10Full[0];
        // Try title attribute for close time
        const titleMatch = d10.match(/title="([^"]+)"/);
        if (titleMatch) closeTime = titleMatch[1];
        // Try input value for close price
        const valMatch = d10.match(/value="([^"]*)"/);
        if (valMatch && valMatch[1]) closePrice = valMatch[1];
        // Check if there's a data11 span inside data10
        const d11Match = d10.match(/class="data11"[\s\S]*?(?:title="([^"]+)"|>([^<]*)<)/);
        if (d11Match) {
          profitPts = (d11Match[1] || d11Match[2] || '').trim();
        }
      }
      
      if (openTime && direction) {
        allRows.push({ openTime, direction, product, openPrice, stopLoss, takeProfit, closeTime, closePrice, profitPts, teacher });
      }
      cnt++;
    }
    
    // Check if there are more pages
    if (cnt < 10) break;
    page++;
  }
  
  console.log('Total rows from pages 1-5:', allRows.length);
  
  // Show all rows with their close status
  allRows.forEach((row, i) => {
    const hasClose = row.closeTime || row.closePrice;
    console.log(`\nRow ${i+1} [${hasClose ? 'CLOSED' : 'OPEN   '}]:`);
    console.log('  ', JSON.stringify(row));
  });
  
  // Stats
  const closed = allRows.filter(r => r.closeTime || r.closePrice);
  const open = allRows.filter(r => !r.closeTime && !r.closePrice);
  const withProfit = allRows.filter(r => r.profitPts);
  console.log('\n--- Stats ---');
  console.log('Open:', open.length, '| Closed:', closed.length, '| With profitPts:', withProfit.length);
}

main().catch(e => console.log('ERR:', e.message));
