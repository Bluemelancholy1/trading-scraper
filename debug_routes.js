const fs = require('fs');
const code = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/proxy-server.js', 'utf8');

// find all route definitions - simple string search
const lines = code.split('\n');
lines.forEach((line, i) => {
  if (line.match(/app\.(get|post|put|delete|use)\s*\(/i) || 
      line.match(/router\.(get|post|put|delete)\s*\(/i)) {
    console.log((i+1) + ': ' + line.trim().substring(0, 120));
  }
});
