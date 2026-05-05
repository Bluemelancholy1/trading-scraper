// 解锁服务器
const http = require('http');

const postData = JSON.stringify({ password: '135917' });

const req = http.request({
  hostname: 'localhost',
  port: 3456,
  path: '/unlock',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
}, (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Response:', d);
  });
});

req.on('error', e => console.error(e));
req.write(postData);
req.end();