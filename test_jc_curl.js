const https = require('https');
const fs = require('fs');

const url = new URL('https://qh.yemacaijing.net/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000&page=1');

const options = {
  hostname: url.hostname,
  path: url.pathname + url.search,
  method: 'GET',
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Cookie': 'Guest_Name=4ufwU803; ishow=iUserPass=135917&iUserName=4421&iAutoLogin=true; bg_img=images%2Fbg%2F23.jpg; ASPSESSIONIDACTRAADQ=BFOFLJDBGMOBNBKPGBALNHNG',
    'Pragma': 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36 Edg/146.0.0.0',
    'sec-ch-ua': '"Chromium";v="146", "Not-A.Brand";v="24", "Microsoft Edge";v="146"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"'
  }
};

console.log('请求建仓提醒页...');
const req = https.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Length:', data.length);
    console.log('First 800 chars:', data.substring(0, 800));
    
    const hasData7 = data.includes('data7');
    const hasData8 = data.includes('data8');
    console.log('\nHas data7 (止损):', hasData7);
    console.log('Has data8 (止盈):', hasData8);
    
    if (!data.includes('请注册会员') && !data.includes('请慢走') && data.length > 500) {
      const liRe = /<li>([\s\S]*?)<\/li>/g;
      let m, count = 0;
      while ((m = liRe.exec(data)) !== null && count < 15) {
        count++;
        const li = m[1];
        const d2 = li.match(/class="data2"[^>]*title="([^"]*)"/);
        const d3 = li.match(/class="data3"[^>]*title="([^"]*)"/);
        const d5 = li.match(/class="data5"[^>]*title="([^"]*)"/);
        const d6 = li.match(/class="data6"[^>]*title="([^"]*)"/);
        const d7 = li.match(/class="data7"[^>]*title="([^"]*)"/); // 止损
        const d8 = li.match(/class="data8"[^>]*title="([^"]*)"/); // 止盈
        const d12 = li.match(/class="data12"[^>]*title="([^"]*)"/); // 老师
        
        console.log('\n第' + count + '条: ' + (d2?d2[1]:'') + ' | ' + (d3?d3[1]:'') + ' | ' + (d5?d5[1]:'') + ' | 开仓:' + (d6?d6[1]:'') + ' | 止损[' + (d7?d7[1]:'空') + '] | 止盈[' + (d8?d8[1]:'空') + '] | ' + (d12?d12[1]:''));
      }
      console.log('\n总条数:', count);
    } else {
      console.log('\n页面返回错误或权限不足');
    }
    
    fs.writeFileSync('jc_curl_result.html', data, 'utf8');
    console.log('\n已保存 jc_curl_result.html');
  });
});
req.on('error', e => console.error('Error:', e.message));
req.end();
