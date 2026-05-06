// 用 node 的 http2 模块试试（浏览器用的是 HTTP/2）
const http2 = require('http2');
const url = 'https://qh.yemacaijing.net/_Data_End_Show.asp?roomid=7000';
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_Image=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';

const client = http2.connect('https://qh.yemacaijing.net', function() {
  console.log('HTTP/2 connected');
  
  const req = client.request({
    ':path': '/_Data_End_Show.asp?roomid=7000',
    ':method': 'GET',
    'cookie': cookie,
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'referer': 'https://qh.yemacaijing.net/',
    'accept-encoding': 'gzip, deflate, br'
  });

  var d = [];
  req.on('response', function(headers) {
    console.log('Status:', headers[':status']);
    console.log('Headers:', JSON.stringify(headers).slice(0, 300));
  });
  
  req.on('data', function(chunk) { d.push(chunk); });
  req.on('end', function() {
    var buf = Buffer.concat(d);
    console.log('Size:', buf.length);
    console.log('First100:', buf.slice(0, 100).toString());
    client.close();
  });
  
  req.setTimeout(15000, function() { req.close(); client.close(); console.log('timeout'); });
});

client.on('error', function(e) { console.log('Connect error:', e.message); });