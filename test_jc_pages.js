const https = require('https');
const cookie = 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG';
const opts = {
  hostname: 'qh.yemacaijing.net',
  path: '/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1',
  headers: { 'Cookie': cookie, 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept': 'text/html', 'Accept-Language': 'zh-CN,zh;q=0.9' }
};
https.get(opts, res => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => {
    console.log('Status:', res.statusCode, 'Length:', data.length);
    // Find total count text
    const totalMatch = data.match(/总(\d+)条/);
    const pageMatch = data.match(/总(\d+)页/);
    console.log('Total rows:', totalMatch ? totalMatch[1] : 'not found');
    console.log('Total pages:', pageMatch ? pageMatch[1] : 'not found');
    // Show first/last JC row times
    const times = [];
    const re = /<li>[\s\S]*?class="data2"[^>]*title="([^"]+)"[\s\S]*?<\/li>/g;
    let m;
    while ((m = re.exec(data)) !== null) {
      const title = m[0].match(/title="([^"]+)"/);
      if (title) times.push(title[1]);
    }
    console.log('JC times in page 1:', times.slice(0, 3), '...', times.slice(-3));
  });
}).on('error', e => console.error(e));
