const https = require('https');

const COOKIE = `Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG`;

const options = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': COOKIE,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  }
};

const req = https.request(options, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    // 模拟 parseEndPage 的解析
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    let count = 0;
    while ((m = re.exec(html)) !== null && count < 30) {
      const li = m[1];
      const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
      
      const product = get(/class="data5"[^>]*title="([^"]+)"/);
      const rawOpen = get(/class="data6"[^>]*title="([^"]+)"/);
      const profitPtsRaw = get(/class="data11"[^>]*title="([^"]+)"/);
      
      if (product && product.includes('恒')) {
        console.log(`恒指: rawOpen=${rawOpen} profitPtsRaw="${profitPtsRaw}"`);
        
        // 检查原始 HTML
        const idx = li.indexOf('data11');
        if (idx > 0) {
          console.log('  data11 context:', li.substring(idx - 20, idx + 80));
        }
      }
      count++;
    }
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
