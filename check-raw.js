// 通过代理服务器获取原始HTML，在代理里加上 /raw 端点来查看
// 这个脚本用于测试

// 先通过 /fetch?raw=true 拿到原始HTML
const http = require('http');

const postData = JSON.stringify({
  page: 1,
  filters: {},
  raw: true
});

const opts = {
  hostname: 'localhost',
  port: 3456,
  path: '/fetch',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    try {
      const r = JSON.parse(d);
      if (r.raw) {
        // 打印原始HTML第一个li的所有内容
        const m = r.raw.match(/<li>([\s\S]*?)<\/li>/g);
        if (m) {
          console.log('=== RAW HTML - FIRST LI ===');
          console.log(m[0]);
          console.log('\n=== ALL CLASSES & ATTRS ===');
          // 提取所有带class的标签
          const tags = [...m[0].matchAll(/<(\w+)([^>]*)>/g)];
          tags.forEach(t => {
            console.log(t[1] + ': ' + t[2].trim());
          });
        } else {
          console.log('No <li> found in raw HTML');
          console.log('First 800:', r.raw.substring(0, 800));
        }
      } else {
        console.log('No raw data:', JSON.stringify(r).substring(0, 200));
      }
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw response:', d.substring(0, 500));
    }
  });
});

req.on('error', e => console.log('ERR:', e.message));
req.write(postData);
req.end();
