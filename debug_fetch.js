// 检查 /fetch 完整返回
const http = require('http');

const req = http.get('http://localhost:3456/fetch?pages=1', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Full response:', d.slice(0, 500));
  });
});

req.on('error', e => console.error(e));