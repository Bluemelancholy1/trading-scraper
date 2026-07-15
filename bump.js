const fs = require('fs');
const path = 'C:\\Users\\chen\\.qclaw\\workspace\\trading-scraper';

// bump package.json
const pj = JSON.parse(fs.readFileSync(path + '\\package.json', 'utf8'));
pj.version = '1.0.25';
fs.writeFileSync(path + '\\package.json', JSON.stringify(pj, null, 2) + '\n');

// bump proxy-server.js
let ps = fs.readFileSync(path + '\\proxy-server.js', 'utf8');
ps = ps.replace(/const APP_VERSION = '[\d.]+'/, "const APP_VERSION = '1.0.25'");
fs.writeFileSync(path + '\\proxy-server.js', ps);

// bump remote-config.json
const rc = JSON.parse(fs.readFileSync(path + '\\remote-config.json', 'utf8'));
rc.latestVersion = '1.0.25';
fs.writeFileSync(path + '\\remote-config.json', JSON.stringify(rc, null, 2) + '\n');

console.log('bumped to 1.0.25');
