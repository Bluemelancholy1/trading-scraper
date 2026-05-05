// Debug: check if 10:01:53 record has data7/data8 in raw HTML
const http = require('http');

const opts = { hostname:'localhost', port:3456, path:'/pc_raw?page=1', method:'GET' };
const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => {
    const re = /<li>([\s\S]*?)<\/li>/g;
    let m;
    let found = 0;
    while ((m = re.exec(d)) !== null) {
      const li = m[1];
      if (li.includes('10:01') || li.includes('10:11') || li.includes('恒指')) {
        found++;
        console.log(`--- Record #${found} (${li.length} chars) ---`);
        // Check for data7/data8
        const hasD7 = li.match(/class="data7"/g);
        const hasD8 = li.match(/class="data8"/g);
        console.log('data7 count:', hasD7 ? hasD7.length : 0);
        console.log('data8 count:', hasD8 ? hasD8.length : 0);
        // Print key fields
        const get = (re2) => { const r = li.match(re2); return r ? r[1].trim() : '(none)'; };
        console.log('time:',   get(/class="data2"[^>]*title="([^"]+)"/));
        console.log('dir:',    get(/class="data3"[^>]*title="([^"]+)"/));
        console.log('product:',get(/class="data5"[^>]*title="([^"]+)"/));
        console.log('open:',   get(/class="data6"[^>]*title="([^"]+)"/));
        console.log('SL:',     get(/class="data7"[^>]*title="([^"]+)"/));
        console.log('TP:',     get(/class="data8"[^>]*title="([^"]+)"/));
        console.log('closeT:', get(/class="data9"[^>]*title="([^"]+)"/));
        console.log('');
      }
    }
    
    // Global stats
    const totalLi = (d.match(/<li>/g) || []).length;
    const totalD7 = (d.match(/class="data7"/g) || []).length;
    const totalD8 = (d.match(/class="data8"/g) || []).length;
    console.log('=== GLOBAL ===');
    console.log('Total <li> records:', totalLi);
    console.log('Total data7 spans:', totalD7);
    console.log('Total data8 spans:', totalD8);
    console.log('HTML length:', d.length);
  });
});
req.end();
