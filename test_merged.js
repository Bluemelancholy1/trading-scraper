const http = require('http');

const steps = [
  { path: '/unlock', data: { password: '881199' } },
  { path: '/login', data: { password: '881199', phone: '16616135917', pass: '135917' } },
];

let step = 0;
function next() {
  if (step >= steps.length) return testFetch();
  const s = steps[step++];
  const postData = JSON.stringify(s.data);
  const req = http.request({
    hostname: 'localhost', port: 3456, path: s.path, method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      console.log(`${s.path}:`, d.slice(0, 50));
      next();
    });
  });
  req.on('error', e => console.log('Err:', e.message));
  req.write(postData);
  req.end();
}
function testFetch() {
  const postData = JSON.stringify({ mode: 'merged', pages: 2, filters: {} });
  const req = http.request({
    hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
  }, (res) => {
    let d = '';
    res.on('data', c => d += c);
    res.on('end', () => {
      try {
        const p = JSON.parse(d);
        if (!p.ok) { console.log('Error:', p.error); return; }
        console.log(`✅ 合并模式返回 ${p.rows?.length} 条`);
        
        const recent = p.rows?.filter(r => r.openTime?.includes('2026/4/29')) || [];
        console.log(`4/29记录: ${recent.length} 条`);
        recent.slice(0, 8).forEach((r, i) => {
          console.log(`${i+1}. ${r.product} ${r.direction} 开:${r.openPrice} SL:${r.stopLoss || '(-)'} TP:${r.takeProfit || '(-)'}`);
        });
        
        const withSL = p.rows?.filter(r => r.stopLoss).length || 0;
        const withTP = p.rows?.filter(r => r.takeProfit).length || 0;
        console.log(`\n统计: ${withSL} 条有止损, ${withTP} 条有止盈`);
      } catch(e) { console.log('Parse:', e.message); }
    });
  });
  req.on('error', e => console.log('Req err:', e.message));
  req.write(postData);
  req.end();
}
next();