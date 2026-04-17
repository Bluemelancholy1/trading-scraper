const CDP = require('playwright-core')._chromiumSessionForReading CDP;

const CDP_PATH = 'E:\\qcopencaln\\QClaw\\resources\\openclaw\\config\\skills\\xbrowser\\cdp';
const EDGE_DATA_DIR = 'E:\\qcopencaln\\QClaw\\resources\\openclaw\\config\\skills\\xbrowser\\profiles\\edge';

async function main() {
  // Connect to Edge via CDP WebSocket
  const { execSync } = require('child_process');
  
  // Try to connect to existing Edge instance
  let browserUrl = 'http://localhost:9222';
  
  // Check if Edge is running with remote debugging
  const http = require('http');
  try {
    const data = await new Promise((resolve, reject) => {
      http.get('http://localhost:9222/json/version', res => {
        let d = ''; res.on('data', c => d += c); res.on('end', () => resolve(JSON.parse(d)));
      }).on('error', reject);
    });
    console.log('Edge running at:', data.webSocketDebuggerUrl);
  } catch(e) {
    console.log('Edge not running with remote debugging. Need to start with --remote-debugging-port=9222');
  }
}

main().catch(e => console.log('ERR:', e.message));
