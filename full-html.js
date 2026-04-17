// 获取完整原始HTML，找所有data*类
const http = require('http');

const postData = JSON.stringify({ page: 1, filters: {}, raw: true });

const req = http.request({
  hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(postData) }
}, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const r = JSON.parse(d);
    if (r.raw) {
      // 打印前3000字符，看整体结构
      console.log('=== FIRST 3000 CHARS ===');
      console.log(r.raw.substring(0, 3000));
      console.log('\n=== ALL data* CLASSES FOUND ===');
      const allData = [...new Set([...r.raw.matchAll(/class="(data\d+)"[^>]*>/g)].map(x => x[1]))];
      console.log(allData);
    }
  });
});

req.on('error', e => console.log('ERR:', e.message));
req.write(postData);
req.end();
