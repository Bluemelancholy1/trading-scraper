// 调试编码问题 - 检查product字段的实际字节
const http = require('http');

const req = http.get('http://localhost:3456/fetch?pages=1', (res) => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const j = JSON.parse(d);
    const recs = (j.rows || []).filter(r => r.product);
    console.log('=== 总记录:', recs.length, '===');
    
    // 找所有德系相关
    recs.filter(r => r.product.includes('德') || r.product.includes('德') || r.product.includes('d') || r.product.includes('\u5fb7'))
      .forEach(r => {
        console.log('=== 匹配到 ===');
        console.log('product:', r.product);
        console.log('product charCodes:', [...r.product].map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '));
        console.log('product bytes (UTF-8):', Buffer.from(r.product, 'utf8').toString('hex'));
        console.log('is \u5fb7?', r.product === '\u5fb7');
        console.log('is 德?', r.product === '德');
      });
    
    // 打印所有product及编码
    console.log('\n=== 所有品种 ===');
    const products = [...new Set(recs.map(r => r.product))];
    products.forEach(p => {
      console.log(p, '|', [...p].map(c => 'U+' + c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')).join(' '), '|', Buffer.from(p, 'utf8').toString('hex'));
    });
  });
});

req.on('error', e => console.error(e));