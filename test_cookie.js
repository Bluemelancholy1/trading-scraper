const https = require('https');
const fs = require('fs');

const aspSession = 'ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO';
const loginCookie = 'ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true';
const cookie = aspSession + '; ' + loginCookie;

console.log('Testing cookie:', cookie.substring(0, 50) + '...');

const opts = {
  hostname: 'qh.yemacaijing.net',
  port: 443,
  path: '/generalModule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': cookie,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
  },
  rejectUnauthorized: false
};

https.request(opts, res => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', data.length);
    console.log('Has 请注册:', data.includes('请注册'));
    if (data.length < 500) {
      console.log('Body:', data);
    } else {
      fs.writeFileSync('cookie_test.html', data, 'latin1');
      console.log('Saved', data.length, 'bytes to cookie_test.html');
    }
  });
}).end();