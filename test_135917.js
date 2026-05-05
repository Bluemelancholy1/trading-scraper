// 用陈少的账号测试平仓提醒数据
const http = require('http');

const body = JSON.stringify({ username: '135917', password: '881199' });
const options = {
  hostname: 'localhost',
  port: 3456,
  path: '/login',
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('登录状态:', res.headers['set-cookie'] ? '成功' : '失败');
    console.log('Cookie:', res.headers['set-cookie']);
    console.log('登录响应:', data);
  });
});
req.on('error', e => console.error('登录请求失败:', e.message));
req.write(body);
req.end();