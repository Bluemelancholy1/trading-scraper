const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('PAGEERR: ' + e.message));
  page.on('console', m => errs.push('[' + m.type() + '] ' + m.text()));
  page.on('requestfailed', r => errs.push('REQFAIL: ' + r.url() + ' ' + (r.failure() && r.failure().errorText)));
  page.on('response', r => { if (r.status() >= 400) errs.push('HTTP' + r.status() + ' ' + r.url()); });
  await page.goto('http://localhost:3456', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  const diag = await page.evaluate(() => ({
    gomokuCreateRoom: typeof gomokuCreateRoom,
    openGomoku: typeof openGomoku,
    showGomokuNet: typeof showGomokuNet,
    doPlace: typeof doPlace,
    hasGomokuScript: !!document.querySelector('script[src="gomoku.js"]'),
    bodyHasGomokuModal: !!document.getElementById('gomokuModal'),
    title: document.title
  }));
  console.log('DIAG:', JSON.stringify(diag, null, 2));
  console.log('ERRORS/LOGS:'); errs.forEach(e => console.log('  ' + e));
  await browser.close();
})().catch(e => { console.error('FATAL', e); process.exit(1); });
