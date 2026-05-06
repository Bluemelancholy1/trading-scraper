const puppeteer = require('puppeteer');

async function loginAndFetch() {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);
  
  console.log('Step 1: Login...');
  
  // 登录
  await page.goto('https://qh.yemacaijing.net/userlogin.asp', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  // 填写账号密码
  await page.type('#username', '16616135917', { delay: 50 });
  await page.type('#password', '135917', { delay: 50 });
  
  // 点击登录
  await Promise.all([
    page.waitForNavigation({ timeout: 10000 }).catch(() => {}),
    page.click('input[type=submit]')
  ]);
  
  console.log('Login submitted, waiting...');
  await page.waitForTimeout(3000);
  
  // 获取 cookies
  const cookies = await page.cookies();
  console.log('Cookies:', cookies.map(c => c.name + '=' + c.value).join('; '));
  
  // 访问平仓提醒
  console.log('\nStep 2: Fetching data...');
  await page.goto('https://qh.yemacaijing.net/generalmodule/shouted/_Data_Ping_Show.asp?roomid=7000&page=1', {
    waitUntil: 'networkidle2',
    timeout: 30000
  });
  
  const content = await page.content();
  const cheerio = require('cheerio');
  const $ = cheerio.load(content);
  const spans = $('span[class^=data]').get();
  
  console.log('Data cells:', spans.length, `(${spans.length/7} rows)`);
  
  // 获取字段名
  const fields = {};
  spans.forEach(s => {
    const cls = $(s).attr('class');
    const txt = $(s).text().trim();
    if (!fields[cls]) fields[cls] = txt;
  });
  console.log('Fields:', Object.keys(fields).join(', '));
  
  await browser.close();
}

loginAndFetch();