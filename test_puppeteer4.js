const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // 新路径
    console.log('=== New path: _Data_Ping_Show ===');
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000', { waitUntil: 'networkidle2', timeout: 20000 });
    let content = await page.content();
    console.log('Length:', content.length);
    
    // 检查字段
    const fields = ['data1', 'data2', 'data3', 'data4', 'data5', 'data6', 'data7', 'data8', 'data9', 'data10', 'data11', 'data12'];
    console.log('\nFields found:');
    for (const f of fields) {
      const count = (content.match(new RegExp(`class="${f}"`, 'g')) || []).length;
      if (count > 0) console.log(`  ${f}: ${count} occurrences`);
    }
    
    // 检查是否有平仓相关
    console.log('\nKeywords:');
    console.log('  平仓:', content.includes('平仓') ? 'YES' : 'no');
    console.log('  止损:', content.includes('止损') ? 'YES' : 'no');
    console.log('  止盈:', content.includes('止盈') ? 'YES' : 'no');
    console.log('  开仓:', content.includes('开仓') ? 'YES' : 'no');
    
    // 试另一个新路径
    console.log('\n=== New path: _Data_End_Show ===');
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_End_Show.asp?roomid=7000', { waitUntil: 'networkidle2', timeout: 20000 });
    content = await page.content();
    console.log('Length:', content.length);
    
    for (const f of fields) {
      const count = (content.match(new RegExp(`class="${f}"`, 'g')) || []).length;
      if (count > 0) console.log(`  ${f}: ${count} occurrences`);
    }
    
    // 试建仓提醒
    console.log('\n=== New path: _data_start_show ===');
    await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_data_start_show.asp?classid=8&roomid=7000', { waitUntil: 'networkidle2', timeout: 20000 });
    content = await page.content();
    console.log('Length:', content.length);
    
    for (const f of fields) {
      const count = (content.match(new RegExp(`class="${f}"`, 'g')) || []).length;
      if (count > 0) console.log(`  ${f}: ${count} occurrences`);
    }
    
  } catch (e) {
    console.log('Error:', e.message);
  }
  
  await browser.close();
})();