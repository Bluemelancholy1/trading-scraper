const fs = require('fs');
let c = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/proxy-server.js', 'utf8');
c = c.replace('ASPSESSIONIDCARTDBCR=EMIDGGEBLODJMDJMDIIDOGIO', 'ASPSESSIONIDCAQSBBDQ=OCCKDKJAJDDBBAPNLBHEHILF');
fs.writeFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/proxy-server.js', c, 'utf8');
console.log('Cookie updated successfully!');