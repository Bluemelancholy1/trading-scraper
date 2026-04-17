// 完整分析平仓页面HTML：找所有数字、所有class、所有可能藏数据的地方
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
    if (!r.raw) { console.log('No raw'); return; }
    
    // 打印前6000字符
    console.log('=== FIRST 6000 CHARS ===');
    console.log(r.raw.substring(0, 6000));
    console.log('\n=== LAST 2000 CHARS ===');
    console.log(r.raw.slice(-2000));
    console.log('\n=== ALL UNIQUE class= ATTRS ===');
    const allClasses = [...new Set([...r.raw.matchAll(/class="([^"]+)"/g)].map(x => x[1]))];
    console.log(allClasses.slice(0, 50));
    console.log('\n=== ALL title= ATTRS ===');
    const allTitles = [...new Set([...r.raw.matchAll(/title="([^"]{2,50})"/g)].map(x => x[1]))];
    console.log(allTitles.slice(0, 30));
    console.log('\n=== ALL var/key DATA ===');
    const vars = [...r.raw.matchAll(/(?:var|let|const|data|info|item)\s*=\s*(\{[^}]{20,})/g)].map(x => x[1].substring(0, 200));
    console.log(vars.slice(0, 5));
  });
});

req.on('error', e => console.log('ERR:', e.message));
req.write(postData);
req.end();
