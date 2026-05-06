const https = require('https');

const COOKIE = `Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG`;

const options = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'Cookie': COOKIE,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Referer': 'https://qh.yemacaijing.net/'
  }
};

const req = https.request(options, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    // 找包含 26060 和 46130 的行
    const rowRegex = /<li[^>]*>[\s\S]*?26060[\s\S]*?<\/li>/gi;
    let match;
    while ((match = rowRegex.exec(html)) !== null) {
      console.log('=== 找到包含 26060 的 li ===');
      const li = match[0];
      
      // 提取所有 data 字段
      const dataFields = [];
      const dataRegex = /class="(data\d+)"[^>]*(?:title="([^"]*)"|value="([^"]*)")/g;
      let dMatch;
      while ((dMatch = dataRegex.exec(li)) !== null) {
        dataFields.push({
          class: dMatch[1],
          title: dMatch[2] || '',
          value: dMatch[3] || ''
        });
      }
      
      console.log('\n字段详情:');
      dataFields.forEach(f => {
        console.log(`  ${f.class}: title="${f.title}" value="${f.value}"`);
      });
      
      // 找 46130 在哪
      if (li.includes('46130')) {
        console.log('\n⚠️ 46130 出现在这个 li 里!');
        const idx = li.indexOf('46130');
        console.log('上下文:', li.substring(Math.max(0, idx - 100), idx + 100));
      }
    }
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
