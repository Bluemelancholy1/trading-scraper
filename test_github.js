const https = require('https');
https.get('https://raw.githubusercontent.com/Bluemelancholy1/trading-scraper/main/remote-config.json', res => {
  let d = '';
  res.on('data', c => d += c);
  res.on('end', () => console.log('Status:', res.statusCode, '\nBody:', d));
}).on('error', e => console.error('Error:', e.message));