const http = require('http');

const req = http.request({
  hostname: 'localhost', port: 3456,
  path: '/unlock', method: 'POST',
  headers: { 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Unlock response:', data);
    if (data.includes('"ok":true')) {
      console.log('✅ 解锁成功！现在测试平仓数据...');
      setTimeout(() => {
        const http2 = require('http');
        const postData = JSON.stringify({ mode: 'pc', pages: 1, filters: {} });
        const req2 = http2.request({
          hostname: 'localhost', port: 3456,
          path: '/fetch', method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
        }, (res2) => {
          let d2 = '';
          res2.on('data', c => d2 += c);
          res2.on('end', () => {
            try {
              const p = JSON.parse(d2);
              if (!p.ok) { console.log('Fetch error:', p.error); return; }
              console.log(`✅ 平仓页返回 ${p.rows?.length} 条`);
              
              const recent = p.rows?.filter(r => r.openTime?.includes('2026/4/29')) || [];
              console.log(`4/29记录: ${recent.length} 条`);
              recent.slice(0, 5).forEach((r, i) => {
                console.log(`${i+1}. ${r.product} ${r.direction} 开:${r.openPrice} SL:${r.stopLoss || '(-)'} TP:${r.takeProfit || '(-)'}`);
              });
              
              const withSL = p.rows?.filter(r => r.stopLoss).length || 0;
              const withTP = p.rows?.filter(r => r.takeProfit).length || 0;
              console.log(`\n统计: ${withSL} 条有止损, ${withTP} 条有止盈`);
            } catch(e) { console.log('Parse:', e.message); }
          });
        });
        req2.on('error', e => console.log('Req2 err:', e.message));
        req2.write(postData);
        req2.end();
      }, 500);
    }
  });
});

req.on('error', e => console.log('Req err:', e.message));
req.write(JSON.stringify({ password: '881199' }));
req.end();