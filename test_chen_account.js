// 测试陈少账号登录，然后抓取平仓页
const http = require('http');

// Step 1: 用陈少账号登录
const body = JSON.stringify({ username: '135917', password: '881199' });
const loginReq = http.request({
  hostname: 'localhost', port: 3456, path: '/login', method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
}, (res) => {
  const cookies = res.headers['set-cookie'];
  console.log('登录结果:', res.headers['set-cookie'] ? '成功' : '失败');
  console.log('Set-Cookie:', cookies);
  
  if (!cookies) {
    console.log('❌ 登录失败，无Cookie');
    return;
  }
  
  // Step 2: 用拿到的Cookie抓取平仓页
  const cookieStr = cookies.join('; ');
  const pingReq = http.request({
    hostname: 'localhost', port: 3456,
    path: '/data-ping?roomid=7000&pages=1',
    method: 'GET',
    headers: { 'Cookie': cookieStr }
  }, (pingRes) => {
    let data = '';
    pingRes.on('data', chunk => data += chunk);
    pingRes.on('end', () => {
      const parsed = JSON.parse(data);
      console.log(`\n✅ 平仓页返回 ${parsed.total} 条记录，取第一条查看结构`);
      if (parsed.data && parsed.data.length > 0) {
        const first = parsed.data[0];
        console.log('第一条记录字段:', Object.keys(first));
        console.log('第一条数据:', JSON.stringify(first, null, 2));
      }
    });
  });
  pingReq.on('error', e => console.error('抓取失败:', e.message));
  pingReq.end();
});
loginReq.on('error', e => console.error('登录失败:', e.message));
loginReq.write(body);
loginReq.end();