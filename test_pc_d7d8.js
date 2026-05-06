const https = require('https');
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';
const opts = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1',
  headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
};
https.get(opts, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    // Search for data7/data8 content in the raw HTML
    const d7Matches = data.match(/class="data7"[^>]*>[^<]*(?:<[^>]*>)*([^<]*)/g);
    const d8Matches = data.match(/class="data8"[^>]*>[^<]*(?:<[^>]*>)*([^<]*)/g);
    console.log('data7 matches count:', d7Matches ? d7Matches.length : 0);
    console.log('data8 matches count:', d8Matches ? d8Matches.length : 0);
    if (d7Matches) console.log('data7 samples:', d7Matches.slice(0, 5));
    if (d8Matches) console.log('data8 samples:', d8Matches.slice(0, 5));
    
    // Also check for title attributes in data7/data8
    const d7Title = data.match(/class="data7"[^>]*title="([^"]+)"/g);
    const d8Title = data.match(/class="data8"[^>]*title="([^"]+)"/g);
    console.log('\ndata7 title matches:', d7Title ? d7Title.length : 0);
    console.log('data8 title matches:', d8Title ? d8Title.length : 0);
    if (d7Title) console.log('data7 title samples:', d7Title.slice(0, 5));
    if (d8Title) console.log('data8 title samples:', d8Title.slice(0, 5));
    
    // Check if data7/8 are inside the <li> or elsewhere
    const liRe = /<li>([\s\S]*?)<\/li>/g;
    const rowsWithD7 = [];
    let m;
    while ((m = liRe.exec(data)) !== null) {
      if (m[1].includes('data7') && m[1].match(/class="data7"[^>]*title="([^"]+)"/)?.[1]) {
        rowsWithD7.push(m[1].match(/class="data7"[^>]*title="([^"]+)"/)[1]);
      }
    }
    console.log('\nRows with data7 title in <li>:', rowsWithD7.length);
    if (rowsWithD7.length > 0) console.log('First 5:', rowsWithD7.slice(0, 5));
    
    // Check the HTML structure of first 3 <li> items
    console.log('\n--- First 3 <li> HTML (first 500 chars each) ---');
    const liAllRe = /<li>([\s\S]{1,500}?)<\/li>/g;
    let i = 0;
    while ((m = liAllRe.exec(data)) !== null && i < 3) {
      console.log('\n--- Row ' + (i+1) + ' ---');
      console.log(m[1].substring(0, 500));
      i++;
    }
  });
}).on('error', e => console.error(e));
