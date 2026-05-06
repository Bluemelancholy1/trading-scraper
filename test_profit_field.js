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
    'Referer': 'https://qh.yemacaijing.net/',
    'sec-ch-ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
};

const req = https.request(options, (res) => {
  let html = '';
  res.on('data', chunk => html += chunk);
  res.on('end', () => {
    console.log('Length:', html.length);
    console.log('\n=== 查找 data11 (获利点数) ===');
    
    // 找所有 data11 的 span
    const data11Regex = /<span[^>]*class="data11"[^>]*title="([^"]*)"/g;
    let match;
    let count = 0;
    while ((match = data11Regex.exec(html)) !== null && count < 10) {
      console.log(`data11 #${count + 1}: "${match[1]}"`);
      count++;
    }
    
    console.log('\n=== 查找 data10 (平仓点位) ===');
    const data10Regex = /<span[^>]*class="data10"[^>]*title="([^"]*)"/g;
    count = 0;
    while ((match = data10Regex.exec(html)) !== null && count < 5) {
      console.log(`data10 #${count + 1}: "${match[1]}"`);
      count++;
    }
    
    console.log('\n=== 查找恒指 26060 的完整记录 ===');
    // 找包含 26060 的行
    const rowRegex = /<tr[^>]*>[\s\S]*?26060[\s\S]*?<\/tr>/gi;
    const rowMatch = html.match(rowRegex);
    if (rowMatch) {
      console.log('找到恒指 26060 记录:');
      rowMatch.forEach((row, i) => {
        // 提取所有 data 字段
        const dataFields = row.match(/class="data\d+"/g);
        const values = row.match(/title="([^"]*)"/g);
        console.log(`\n记录 ${i + 1}:`);
        console.log('字段数:', dataFields ? dataFields.length : 0);
        console.log('值:', values ? values.slice(0, 15).join(', ') : 'none');
      });
    }
  });
});

req.on('error', e => console.error('Error:', e.message));
req.end();
