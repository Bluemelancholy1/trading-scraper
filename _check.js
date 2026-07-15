const http = require('http');
const fs = require('fs');

const fileContent = fs.readFileSync('C:/Users/chen/.qclaw/workspace/trading-scraper/app.js', 'utf8');

http.get('http://localhost:3456/app.js', (res) => {
  let serverContent = '';
  res.on('data', chunk => serverContent += chunk);
  res.on('end', () => {
    console.log('Server length:', serverContent.length);
    console.log('File length:', fileContent.length);
    console.log('Match:', serverContent.length === fileContent.length);
    if (serverContent.length !== fileContent.length) {
      console.log('Server[2075-2095]:', JSON.stringify(serverContent.substring(2075, 2095)));
      console.log('File[2075-2095]:', JSON.stringify(fileContent.substring(2075, 2095)));
    }
  });
}).on('error', e => console.log('Error:', e.message));
