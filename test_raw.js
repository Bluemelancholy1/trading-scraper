const http = require('http');
http.get('http://localhost:3456/data-ping?roomid=7000&pages=1', (res) => {
  let data = '';
  res.on('data', c => data += c);
  res.on('end', () => {
    console.log('Status:', res.statusCode);
    console.log('Raw length:', data.length);
    console.log('First 500 chars:', data.slice(0, 500));
  });
}).on('error', e => console.log('Error:', e.message));