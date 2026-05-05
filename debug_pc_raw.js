const http = require('http');

function post(url, body) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = {
      hostname: u.hostname, port: u.port || 3456,
      path: u.pathname, method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    };
    const x = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    x.write(JSON.stringify(body));
    x.end();
  });
}

function get(url) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const opts = { hostname: u.hostname, port: u.port || 3456, path: u.pathname, method: 'GET' };
    const x = http.request(opts, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ s: res.statusCode, b: d }));
    });
    x.end();
  });
}

(async () => {
  const u1 = await post('http://localhost:3456/unlock', { password: '414102' });
  console.log('unlock:', u1.b);
  const u2 = await post('http://localhost:3456/login', { phone: '16616135917', pass: '881199' });
  console.log('login:', u2.b);
  const u3 = await get('http://localhost:3456/pc_raw');
  console.log('pc_raw:', u3.b);
})().catch(e => console.error(e.message));
