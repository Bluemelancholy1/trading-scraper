const http = require('http');
const data = JSON.stringify({password: '135917'});
const req = http.request({hostname:'localhost',port:3456,path:'/unlock',method:'POST',headers:{'Content-Type':'application/json','Content-Length':data.length}}, res => {
  let body = '';
  res.on('data', c => body += c);
  res.on('end', () => console.log(`Status: ${res.statusCode} | Body: ${body}`));
});
req.on('error', e => console.error('Error:', e.message));
req.write(data);
req.end();