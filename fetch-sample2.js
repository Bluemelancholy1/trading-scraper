// 临时脚本：抓取建仓提醒原始HTML，分析所有字段
const https = require('https');
const cookie = 'ASPSESSIONIDCCRRBADQ=BNFDLPAACMEFNPABCIGHJJIE';

// 建仓提醒页面（classid=8）
const opt = {
  hostname: 'nbqh.lulutong.club',
  path: '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1',
  method: 'GET',
  headers: { 'User-Agent': 'Mozilla/5.0', 'Cookie': cookie },
  timeout: 15000
};

const req = https.request(opt, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const m = d.match(/<li>([\s\S]*?)<\/li>/g);
    if (m) {
      console.log('=== 建仓提醒 FIRST LI ===');
      console.log(m[0]);
      console.log('\n=== ALL CLASSES ===');
      const classes = [...new Set([...m[0].matchAll(/class="(data\d+|[\w-]+)"/g)].map(x => x[1]))];
      console.log(classes);
      console.log('\n=== PAGE TITLE/TOTAL ===');
      const total = d.match(/总(\d+)条/);
      const title = d.match(/<title>(.*?)<\/title>/);
      console.log('Total:', total ? total[1] : 'N/A');
      console.log('Title:', title ? title[1] : 'N/A');
    } else {
      console.log('NO ROWS | status=' + res.statusCode + ' | len=' + d.length);
      console.log('First 500:', d.substring(0, 500));
    }
  });
});

req.on('timeout', () => { req.destroy(); console.log('TIMEOUT'); });
req.on('error', e => console.log('ERR:' + e.message));
req.end();
