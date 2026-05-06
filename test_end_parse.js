const https = require('https');
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

function httpGet(path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: 'qh.yemacaijing.net', path,
      headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
    };
    https.get(opts, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => resolve({ status: res.statusCode, body: d })); }).on('error', reject);
  });
}

async function main() {
  const r = await httpGet('/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1');
  console.log('Status:', r.status, 'Length:', r.body.length);
  
  // Parse with li regex
  const re = /<li>([\s\S]*?)<\/li>/g;
  const rows = [];
  let m;
  while ((m = re.exec(r.body)) !== null) {
    const li = m[1];
    const get = re2 => { const r2 = li.match(re2); return r2 ? r2[1].trim() : ''; };
    
    const openTime = get(/class="data2"[^>]*title="([^"]+)"/);
    if (!openTime) continue;
    
    const direction = get(/class="data3"[^>]*title="([^"]+)"/);
    const product = get(/class="data5"[^>]*title="([^"]+)"/);
    const rawOpen = get(/class="data6"[^>]*title="([^"]+)"/);
    const stopLoss = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const closeTime = get(/class="data9"[^>]*title="([^"]+)"/);
    // data10 could be input or span
    let closePrice = get(/class="data10"[^>]*title="([^"]+)"/);
    if (!closePrice) {
      const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
      if (d10) { const v = d10[0].match(/value="([^"]*)"/); closePrice = v ? v[1].trim() : ''; }
    }
    const teacher = get(/class="data12"[^>]*title="([^"]+)"/);
    
    // Smart open price parsing
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    
    rows.push({ openTime, direction, product, openPrice, stopLoss, takeProfit, closeTime, closePrice, teacher });
  }
  
  console.log('Total rows:', rows.length);
  console.log('\nFirst 10 rows:');
  rows.slice(0, 10).forEach((r, i) => {
    console.log((i+1) + '. ' + r.openTime + ' | ' + r.direction + ' | ' + r.product + ' | 开:' + r.openPrice + ' | 止:' + r.stopLoss + ' | 盈:' + r.takeProfit + ' | 平:' + r.closePrice + ' | ' + r.teacher);
  });
  
  // Check how many have SL/TP
  const withSL = rows.filter(r => r.stopLoss).length;
  const withTP = rows.filter(r => r.takeProfit).length;
  const closed = rows.filter(r => r.closePrice && r.closePrice !== '0').length;
  console.log('\nStats: with SL=' + withSL + '/' + rows.length + ', with TP=' + withTP + '/' + rows.length + ', closed=' + closed + '/' + rows.length);
}

main().catch(console.error);
