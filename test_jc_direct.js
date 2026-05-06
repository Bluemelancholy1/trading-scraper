const https = require('https');

const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';
const opts = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1',
  headers: {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://qh.yemacaijing.net/index.asp'
  }
};
https.get(opts, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Length:', data.length);
    // Parse JC data
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m, count = 0;
    while ((m = re.exec(data)) !== null && count < 5) {
      const li = m[1];
      const get = re2 => { const r = li.match(re2); return r ? r[1].trim() : ''; };
      const openTime = get(/class="data2"[^>]*title="([^"]+)"/);
      if (!openTime) continue;
      const stopLoss = get(/class="data7"[^>]*title="([^"]+)"/);
      const takeProfit = get(/class="data8"[^>]*title="([^"]+)"/);
      const product = get(/class="data5"[^>]*title="([^"]+)"/);
      const direction = get(/class="data3"[^>]*title="([^"]+)"/);
      const rawOpen = get(/class="data6"[^>]*title="([^"]+)"/);
      console.log('JC row:', openTime, '|', direction, '|', product, '| 开:', rawOpen, '| 止:', stopLoss, '| 盈:', takeProfit);
      count++;
    }
    if (count === 0) {
      console.log('No JC rows found. First 300 chars:', data.substring(0, 300));
    }
  });
}).on('error', e => console.error('Error:', e.message));
