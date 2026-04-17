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

  // Fetch 建仓提醒 page
  const r = await fetch('https://nbqh.lulutong.club/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000', 'GET', null, {Cookie: fullCookie});
  console.log('Status:', r.status, 'Len:', r.body.length);
  
  // Parse rows
  const rows = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(r.body)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
    
    const openTime   = get(/class="data2"[^>]*title="([^"]+)"/);
    const direction  = get(/class="data3"[^>]*title="([^"]+)"/);
    const product    = get(/class="data5"[^>]*title="([^"]+)"/);
    const openPrice  = get(/class="data6"[^>]*title="([^"]+)"/);
    const stopLoss   = get(/class="data7"[^>]*title="([^"]+)"/);
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/);
    const teacher    = get(/class="data9"[^>]*title="([^"]+)"/);
    
    // close time/price: from data10 span (may be empty for open positions)
    const data10Match = li.match(/class="data10"[\s\S]*?<\/span>/);
    let closeTime = '', closePrice = '', profitPts = '';
    if (data10Match) {
      closeTime = (data10Match[0].match(/title="([^"]+)"/) || [])[1] || '';
      closePrice = (data10Match[0].match(/value="([^"]*)"/) || [])[1] || '';
    }
    // profit points: from data11 span
    const data11Match = li.match(/class="data11"[\s\S]*?<\/span>/);
    if (data11Match) {
      profitPts = (data11Match[0].match(/title="([^"]+)"/) || [])[1] || data11Match[0].replace(/<[^>]+>/g, '').trim();
    }
    
    if (openTime && direction && product) {
      rows.push({ openTime, direction, product, openPrice, stopLoss, takeProfit, closeTime, closePrice, profitPts, teacher });
    }
  }
  
  console.log('\nTotal rows:', rows.length);
  rows.slice(0, 5).forEach((row, i) => {
    console.log(`\nRow ${i+1}:`, JSON.stringify(row));
  });
  
  // Count rows with stopLoss/takeProfit
  const withSL = rows.filter(r => r.stopLoss);
  const withTP = rows.filter(r => r.takeProfit);
  const withClose = rows.filter(r => r.closePrice);
  const withProfit = rows.filter(r => r.profitPts);
  console.log('\nWith stopLoss:', withSL.length, '| With takeProfit:', withTP.length, '| With closePrice:', withClose.length, '| With profitPts:', withProfit.length);
}

main().catch(e => console.log('ERR:', e.message));
