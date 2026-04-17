const http = require('http');
http.get('http://localhost:3456/status', r => {
  let d = ''; r.on('data', c => d += c);
  r.on('end', () => {
    console.log('Status:', d);
    // Test fetch
    const body = JSON.stringify({ mode: 'jc' });
    const req = http.request({ hostname: 'localhost', port: 3456, path: '/fetch', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) }
    }, res => {
      let d2 = ''; res.on('data', c => d2 += c);
      res.on('end', () => {
        const j = JSON.parse(d2);
        console.log('Fetch OK:', j.ok, 'rows:', j.rows.length, 'total:', j.totalRows);
        if (j.rows.length > 0) {
          console.log('First row:', JSON.stringify(j.rows[0]));
        }
      });
    });
    req.write(body); req.end();
  });
}).on('error', e => console.log('ERR:', e.message));
