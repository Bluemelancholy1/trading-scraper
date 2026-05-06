const http = require('http');

const options = {
  hostname: 'localhost',
  port: 3456,
  path: '/unlock',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Unlock:', data);
    
    // 然后获取数据
    const req2 = http.request({
      hostname: 'localhost',
      port: 3456,
      path: '/fetch?mode=merged&maxPages=1',
      method: 'GET'
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        const result = JSON.parse(data2);
        console.log('\n=== 前5条数据 ===');
        result.rows.slice(0, 5).forEach((r, i) => {
          console.log(`${i + 1}. ${r.product} ${r.direction} ${r.openPrice}->${r.closePrice} profitPts="${r.profitPts}" SL="${r.stopLoss}" TP="${r.takeProfit}" ${r.teacher}`);
        });
        
        // 找恒指记录
        console.log('\n=== 恒指记录 ===');
        const hsiRows = result.rows.filter(r => r.product && r.product.includes('恒'));
        hsiRows.forEach((r, i) => {
          console.log(`${i + 1}. ${r.openTime} ${r.product} ${r.direction} ${r.openPrice}->${r.closePrice} profitPts="${r.profitPts}" SL="${r.stopLoss}" TP="${r.takeProfit}" ${r.teacher}`);
        });
      });
    });
    req2.end();
  });
});

req.on('error', e => console.error('Error:', e.message));
req.write(JSON.stringify({ password: '135917' }));
req.end();
