const fs = require('fs');
const code = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/proxy-server.js', 'utf8');
// Find /login route
const lines = code.split('\n');
lines.forEach((l, i) => {
  if (l.includes('/login') || l.includes('router.post')) {
    console.log((i+1) + ': ' + l.trim());
  }
});