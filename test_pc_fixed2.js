const http = require('http');

const postData = JSON.stringify({ mode: 'pc', pages: 1, filters: {} });

const req = http.request({
  hostname: 'localhost', port: 3456,
  path: '/fetch', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': postData.length }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      if (!parsed.ok) {
        console.log('Error:', parsed.error);
        return;
      }
      console.log(`✅ 平仓页返回 ${parsed.rows?.length || 0} 条记录`);
      
      // 找4/29的记录
      const recent = parsed.rows?.filter(r => r.openTime?.includes('2026/4/29')) || [];
      console.log(`\n4/29记录: ${recent.length} 条`);
      
      recent.slice(0, 5).forEach((r, i) => {
        console.log(`${i+1}. ${r.product} ${r.direction} 开仓:${r.openPrice} 止损:${r.stopLoss || '(空)'} 止盈:${r.takeProfit || '(空)'}`);
      });
      
      // 统计有SL/TP的
      const withSL = parsed.rows?.filter(r => r.stopLoss).length || 0;
      const withTP = parsed.rows?.filter(r => r.takeProfit).length || 0;
      console.log(`\n统计: ${withSL}/${parsed.rows?.length} 条有止损, ${withTP} 条有止盈`);
    } catch(e) {
      console.log('Parse error:', e.message);
      console.log('Raw:', data.slice(0, 500));
    }
  });
});

req.on('error', e => console.log('Request error:', e.message));
req.write(postData);
req.end();