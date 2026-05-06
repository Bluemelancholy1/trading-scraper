const https = require('https');

const url = 'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000';
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_Image=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

function testWithHeaders(extra) {
  return new Promise(function(resolve) {
    const req = https.get(url, {
      headers: {
        'Cookie': cookie,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
        'Referer': 'https://qh.yemacaijing.net/',
        ...extra
      }
    }, function(res) {
      var d = '';
      res.on('data', function(c) { d += c; });
      res.on('end', function() { resolve({ status: res.statusCode, size: d.length, first100: d.slice(0, 100) }); });
    });
    req.on('error', function(e) { resolve({ error: e.message }); });
    req.setTimeout(15000, function() { req.destroy(); resolve({ error: 'timeout' }); });
  });
}

(async function() {
  console.log('=== Test 1: Full headers (with Referer) ===');
  var r = await testWithHeaders({});
  console.log(JSON.stringify(r));

  if (r.error || r.size < 1000) {
    console.log('\n=== Test 2: No Referer ===');
    r = await testWithHeaders({ 'Referer': '' });
    console.log(JSON.stringify(r));
  }

  if (r.error || r.size < 1000) {
    console.log('\n=== Test 3: Only essential cookies ===');
    r = await testWithHeaders({ 
      'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG'
    });
    console.log(JSON.stringify(r));
  }
})();