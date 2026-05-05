// 测试修复后的平仓页SL/TP解析
const http = require('http');

const req = http.request({
  hostname: 'localhost', port: 3456,
  path: '/data-ping?roomid=7000&pages=1',
  method: 'GET'
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    console.log(`✅ 平仓页返回 ${parsed.total} 条记录`);
    console.log('\n前3条记录的SL/TP字段:');
    parsed.data.slice(0, 3).forEach((r, i) => {
      console.log(`${i+1}. ${r.product} ${r.direction} - 止损:${r.stopLoss || '(空)'} 止盈:${r.takeProfit || '(空)'}`);
    });
    
    // 统计有SL/TP的记录
    const withSL = parsed.data.filter(r => r.stopLoss).length;
    const withTP = parsed.data.filter(r => r.takeProfit).length;
    console.log(`\n统计: ${withSL}/${parsed.data.length} 条有止损, ${withTP}/${parsed.data.length} 条有止盈`);
  });
});
req.on('error', e => console.error('请求失败:', e.message));
req.end();