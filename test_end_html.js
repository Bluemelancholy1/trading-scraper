const https = require('https');

const options = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://qh.yemacaijing.net/',
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    // 找第一个 <li> 标签
    const m = data.match(/<li>([\s\S]*?)<\/li>/);
    if (m) {
      console.log('First <li> content (first 2000 chars):');
      console.log(m[1].substring(0, 2000));
      console.log('\n--- Extracting fields ---');
      const li = m[1];
      const get = re => { const r = li.match(re); return r ? r[1] : '(not found)'; };
      console.log('data2 (开仓时间):', get(/class="data2"[^>]*title="([^"]+)"/));
      console.log('data3 (方向):', get(/class="data3"[^>]*title="([^"]+)"/));
      console.log('data5 (商品):', get(/class="data5"[^>]*title="([^"]+)"/));
      console.log('data6 (开仓价):', get(/class="data6"[^>]*title="([^"]+)"/));
      console.log('data7 (止损):', get(/class="data7"[^>]*title="([^"]+)"/));
      console.log('data8 (止盈):', get(/class="data8"[^>]*title="([^"]+)"/));
      console.log('data9 (平仓时间):', get(/class="data9"[^>]*title="([^"]+)"/));
      console.log('data10 (平仓价):', get(/class="data10"[^>]*title="([^"]+)"/));
      console.log('data11:', get(/class="data11"[^>]*title="([^"]+)"/));
      console.log('data12 (老师):', get(/class="data12"[^>]*title="([^"]+)"/));
    }
  });
});
req.end();
