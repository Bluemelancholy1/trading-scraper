const https = require('https');
// 测试直播间页面（应该正常）
const urls = [
  'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000&page=1',
  'https://qh.yemacaijing.net/room.asp?roomid=7000',
  'https://qh.yemacaijing.net/index.asp',
];

function testUrl(url) {
  return new Promise(resolve => {
    https.get(url, {
      headers: {
        'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, size: d.length, first50: d.slice(0, 50) }));
    }).on('error', e => resolve({ error: e.message }));
  });
}

(async () => {
  for (const u of urls) {
    const r = await testUrl(u);
    console.log(u.split('/').pop() + ':', JSON.stringify(r));
  }
})();