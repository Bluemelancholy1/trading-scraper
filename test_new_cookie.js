const https = require('https');
const fs = require('fs');

// 从陈少浏览器提取的新Cookie
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; ASPSESSIONIDCAQSBBDQ=OCCKDKJAJDDBBAPNLBHEHILF';

console.log('Testing new cookie...');

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
    if (data.includes('请注册')) {
      console.log('Still needs registration');
    } else if (data.includes('data7')) {
      console.log('✅ SUCCESS! Has data7 field');
      fs.writeFileSync('end_test_new.html', data, 'utf8');
      console.log('Saved to end_test_new.html');
    } else {
      console.log('Response:', data.substring(0, 500));
    }
  });
}).end();