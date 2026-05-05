const http = require('http');
const fs = require('fs');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body || {});
    const req = http.request({
      hostname: 'localhost', port: 3456,
      path, method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => resolve(s));
    });
    req.on('error', reject);
    if (body) req.write(data);
    req.end();
  });
}

function get(path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost', port: 3456,
      path, method: 'GET'
    }, res => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => resolve(s));
    });
    req.on('error', reject);
    req.end();
  });
}

async function main() {
  // Step 1: unlock
  console.log('Step 1: Unlock...');
  const u = await post('/unlock', { password: '881199' });
  const uj = JSON.parse(u);
  console.log('   Result:', uj.ok ? 'OK' : uj.error);

  // Step 2: login to get cookies
  console.log('\nStep 2: Login for ASP session...');
  const l = await post('/login', { appPass: '881199', phone: '16616135917', pass: '881199' });
  const lj = JSON.parse(l);
  console.log('   Result:', lj);

  // Step 3: fetch raw PC page
  console.log('\nStep 3: Fetch /pc_raw (raw HTML from ASP)...');
  const raw = await get('/pc_raw');
  console.log('   /pc_raw response:', raw.substring(0, 200));

  // Step 4: read the saved file
  console.log('\nStep 4: Reading pc_raw.html...');
  const html = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/pc_raw.html', 'utf8');
  console.log('   File size:', html.length, 'bytes');

  // Find title/header row
  const titleMatch = html.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<\/div>/i);
  if (titleMatch) {
    console.log('\n=== TITLE ROW ===');
    console.log(titleMatch[0].substring(0, 1000));
  }

  // Find first <li> record
  const liMatch = html.match(/<li[\s\S]*?<\/li>/);
  if (liMatch) {
    console.log('\n=== FIRST <li> RECORD ===');
    console.log(liMatch[0].substring(0, 2000));
  }

  // Check for data7/data8
  console.log('\n=== DATA FIELD CHECK ===');
  console.log('Contains "data7":', html.includes('data7'));
  console.log('Contains "data8":', html.includes('data8'));
  console.log('Contains "止损":', html.includes('止损'));
  console.log('Contains "止盈":', html.includes('止盈'));

  // Count <li> records
  const lis = html.match(/<li/g);
  console.log('\nTotal <li> tags:', lis ? lis.length : 0);
}

main().catch(e => console.error('Error:', e.message));
