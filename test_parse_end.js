const https = require('https');

// 直接测试 parseEndPage 函数
function parseEndPage(html) {
  const rows = [];
  const re = /<li>([\s\S]*?)<\/li>/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    const li = m[1];
    const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
    
    const openTime  = get(/class="data2"[^>]*title="([^"]+)"/);
    if (!openTime) continue;
    const direction = get(/class="data3"[^>]*title="([^"]+)"/);
    const product   = get(/class="data5"[^>]*title="([^"]+)"/);
    const rawOpen   = get(/class="data6"[^>]*title="([^"]+)"/);
    const stopLoss  = get(/class="data7"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/).replace(/\u00a0/g, ' ');
    const closeTime = get(/class="data9"[^>]*title="([^"]+)"/);
    let closePrice = get(/class="data10"[^>]*title="([^"]+)"/);
    if (!closePrice) {
      const d10 = li.match(/class="data10"[\s\S]*?<\/span>/);
      if (d10) { const v = d10[0].match(/value="([^"]*)"/); closePrice = v ? v[1].trim() : ''; }
    }
    const teacher   = get(/class="data12"[^>]*title="([^"]+)"/);
    const profitPtsRaw = get(/class="data11"[^>]*title="([^"]+)"/);
    
    let openPrice = rawOpen;
    const rawNum = rawOpen.replace(/\D/g, '');
    if (rawNum.length >= 8 && rawNum.length <= 14) {
      openPrice = rawNum.substring(0, Math.ceil(rawNum.length / 2));
    }
    
    const isClosed = !!(closePrice && closePrice !== '0');
    let profitPts = '';
    if (profitPtsRaw && profitPtsRaw !== '0') {
      profitPts = profitPtsRaw;
    } else if (isClosed && openPrice && closePrice) {
      const op = parseFloat(openPrice);
      const cp = parseFloat(closePrice);
      if (!isNaN(op) && !isNaN(cp) && op > 0 && cp > 0) {
        const diff = direction === '多' ? (cp - op) : (op - cp);
        profitPts = diff.toFixed(2);
      }
    }
    
    if (openPrice && direction) {
      rows.push({
        openTime, direction, product, openPrice,
        stopLoss: stopLoss || '',
        takeProfit: takeProfit || '',
        closeTime: closeTime || '', closePrice: closePrice || '',
        profitPts, teacher: teacher || '',
        source: 'end', isClosed,
      });
    }
  }
  return rows;
}

const options = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html',
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    const rows = parseEndPage(data);
    console.log('Parsed rows:', rows.length);
    rows.slice(0, 10).forEach((row, i) => {
      console.log((i+1) + '. ' + row.product + ' | profitPts=' + JSON.stringify(row.profitPts) + ' | profitPtsRaw check');
    });
  });
});
req.end();
