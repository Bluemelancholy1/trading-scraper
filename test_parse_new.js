const puppeteer = require('puppeteer');
const cheerio = require('cheerio');

async function testAndParse() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  console.log('Fetching data from new path...');
  
  await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  const content = await page.content();
  
  // 用 cheerio 解析
  const $ = cheerio.load(content);
  const spans = $('span[class^=data]').get();
  
  console.log('Total data cells found:', spans.length);
  
  // 按 class 分组显示
  const fields = {};
  spans.forEach(s => {
    const cls = $(s).attr('class');
    const txt = $(s).text().trim();
    if (!fields[cls]) fields[cls] = [];
    fields[cls].push(txt);
  });
  
  console.log('\nFields found:');
  Object.keys(fields).forEach(k => {
    console.log(' -', k, ':', fields[k][0] || '(empty)');
  });
  
  console.log('\nTotal unique field classes:', Object.keys(fields).length);
  
  await browser.close();
}

testAndParse();