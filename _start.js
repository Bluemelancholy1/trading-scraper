const { spawn } = require('child_process');

const server = spawn('node', ['proxy-server.js'], {
  cwd: 'C:/Users/chen/.qclaw/workspace/trading-scraper',
  detached: true,
  stdio: 'ignore'
});

server.unref();
console.log('Server started, PID:', server.pid);

setTimeout(() => {
  const http = require('http');
  http.get('http://localhost:3456/status', (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => console.log('Status:', data));
  }).on('error', (e) => console.log('Error:', e.message));
}, 2000);
