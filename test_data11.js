const https = require('https');

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
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    let count = 0;
    while ((m = re.exec(data)) !== null) {
      count++;
      const li = m[1];
      const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
      const product = get(/class="data5"[^>]*title="([^"]+)"/);
      const profitPtsRaw = get(/class="data11"[^>]*title="([^"]+)"/);
      const closePrice = get(/class="data10"[^>]*title="([^"]+)"/);
      if (count <= 10) {
        console.log(count + '. ' + product + ' | data11=' + JSON.stringify(profitPtsRaw) + ' | closePrice=' + closePrice);
      }
    }
  });
});
req.end();
