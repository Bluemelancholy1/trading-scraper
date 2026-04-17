// 临时脚本：抓取一条平仓记录原始HTML，分析所有字段
const https = require('https');

// 先用已知cookie
const cookie = 'ASPSESSIONIDCCRRBADQ=BNFDLPAACMEFNPABCIGHJJIE';

const opt = {
  hostname: 'nbqh.lulutong.club',
  path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
  timeout: 15000
};

const req = https.request(opt, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    // 匹配第一个<li>完整内容
    const m = d.match(/<li>([\s\S]*?)<\/li>/g);
    if (m) {
      console.log('=== FIRST LI ===');
      console.log(m[0]);
      console.log('\n=== ALL CLASSES ===');
      const classes = [...m[0].matchAll(/class="(data\d+)"/g)];
      console.log('Field classes found:', classes.map(x => x[1]));
    } else {
      console.log('NO ROWS | status=' + res.statusCode + ' | len=' + d.length);
      console.log('First 300:', d.substring(0, 300));
    }
  });
});

req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
req.on('error', e => console.log('ERR:' + e.message));
req.end();
