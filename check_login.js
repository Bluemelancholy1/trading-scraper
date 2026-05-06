const puppeteer = require('puppeteer');

async function checkLoginPage() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  console.log('Loading login page...');
  await page.goto('https://qh.yemacaijing.net/userlogin.asp', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });
  
  // 保存截图
  await page.screenshot({ path: 'login_page.png' });
  
  // 获取 HTML
  const content = await page.content();
  console.log('Login page length:', content.length);
  
  // 查找表单元素
  const cheerio = require('cheerio');
  const $ = cheerio.load(content);
  
  console.log('\nForms:', $('form').length);
  console.log('Inputs:', $('input').length);
  console.log('Input names/types:', $('input').map((i, el) => {
    const e = $(el);
    return e.attr('name') + ':' + e.attr('type') + '=' + e.val();
  }).get().join(', '));
  
  console.log('\nPage text sample:', content.substring(0, 500));
  
  await browser.close();
}

checkLoginPage();