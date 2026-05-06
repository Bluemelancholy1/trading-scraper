const http = require('http');

// 用浏览器完整请求头
const options = {
  hostname: 'qh.yemacaijing.net',
  port: 443,
  path: '/generalmodule/shouted/_Data_End_Show.asp?roomid=7000&page=1',
  method: 'GET',
  headers: {
    'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'cache-control': 'no-cache',
    'pragma': 'no-cache',
    'sec-ch-ua': '"Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'sec-fetch-dest': 'document',
    'sec-fetch-mode': 'navigate',
    'sec-fetch-site': 'same-origin',
    'sec-fetch-user': '?1',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36',
    'cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG'
  }
};

const https = require('https');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    // 搜索所有包含 26060 的 li
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    let count = 0;
    while ((m = re.exec(data)) !== null) {
      if (m[1].includes('26060')) {
        count++;
        console.log(`\n=== 包含26060的第${count}条记录（完整HTML） ===`);
        console.log(m[1]);
      }
    }
  });
});
req.on('error', e => console.error(e));
req.end();
