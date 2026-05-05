const http = require('http');

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
  // unlock
  console.log('1. Unlocking...');
  const u = await post('/unlock', { password: '881199' });
  console.log('   unlock:', u.substring(0, 80));

  // get raw PC page HTML
  console.log('2. Fetching raw PC page...');
  const html = await get('/api/pc?page=1&pt=');
  
  // find title row
  const titleMatch = html.match(/<div[^>]*class="[^"]*title[^"]*"[^>]*>[\s\S]*?<\/div>/i);
  if (titleMatch) {
    console.log('\n=== TITLE ROW ===');
    console.log(titleMatch[0].substring(0, 800));
  }

  // find all <li> records
  const liRegex = /<li[\s\S]*?<\/li>/g;
  const lis = [];
  let m;
  while ((m = liRegex.exec(html)) !== null) {
    lis.push(m[0]);
  }
  console.log('\nFound', lis.length, '<li> records');
  
  if (lis.length > 0) {
    console.log('\n=== FIRST LI RAW HTML ===');
    console.log(lis[0].substring(0, 2000));
    
    // also check for data7/data8 in the HTML
    const hasData7 = html.includes('data7') || html.includes('data8');
    console.log('\nHas data7 in HTML:', hasData7);
    
    // check for 止损/止盈 text
    const hasSL = html.includes('止损') || html.includes('stopLoss');
    const hasTP = html.includes('止盈') || html.includes('takeProfit');
    console.log('Has SL text:', hasSL, 'Has TP text:', hasTP);
  } else {
    console.log('No <li> found. First 1000 chars:');
    console.log(html.substring(0, 1000));
  }
}

main().catch(e => console.error('Error:', e.message));
