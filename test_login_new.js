const https = require('https');
const querystring = require('querystring');

const data = querystring.stringify({
  username: '16616135917',
  password: '135917',
  roompwd: '414102'
});

const options = {
  hostname: 'qh.yemacaijing.net',
  port: 443,
  path: '/generalmodule/shouted/_Data_Login_Check.asp',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
    'Content-Length': Buffer.byteLength(data),
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
    'Referer': 'https://qh.yemacaijing.net/'
  }
};

const req = https.request(options, (res) => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers, null, 2));
  let body = '';
  res.on('data', chunk => body += chunk);
  res.on('end', () => {
    console.log('Body length:', body.length);
    console.log('Body:', body.substring(0, 1000));
  });
});
req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
