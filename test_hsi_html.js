const https = require('https');

const options = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // 找所有 <li> 标签
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    let count = 0;
    while ((m = re.exec(data)) !== null) {
      count++;
      if (count < 4) continue; // 跳过前3条
      const li = m[1];
      const get = re2 => { const r = li.match(re2); return r ? r[1] : ''; };
      const product = get(/class="data5"[^>]*title="([^"]+)"/);
      if (product === '恒指') {
        console.log('Found 恒指 record #' + count + ':');
        console.log('data2 (开仓时间):', get(/class="data2"[^>]*title="([^"]+)"/));
        console.log('data3 (方向):', get(/class="data3"[^>]*title="([^"]+)"/));
        console.log('data6 (开仓价):', get(/class="data6"[^>]*title="([^"]+)"/));
        console.log('data9 (平仓时间):', get(/class="data9"[^>]*title="([^"]+)"/));
        console.log('data10 (平仓价):', get(/class="data10"[^>]*title="([^"]+)"/));
        console.log('data11:', get(/class="data11"[^>]*title="([^"]+)"/));
        console.log('Full li (first 1500 chars):', li.substring(0, 1500));
        break;
      }
    }
  });
});
req.end();
