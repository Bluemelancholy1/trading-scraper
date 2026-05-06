const http = require('http');

const opts = {
  hostname: 'localhost',
  port: 3456,
  path: '/unlock',
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
};

const req = http.request(opts, res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log(d));
});

req.on('error', e => console.error(e.message));
req.write(JSON.stringify({ password: '135917' }));
req.end();