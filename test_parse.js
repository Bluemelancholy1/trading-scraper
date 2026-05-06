const fs = require('fs');
const path = require('path');

// Load proxy-server functions
const code = fs.readFileSync(path.join(__dirname, 'proxy-server.js'), 'utf-8');

// Extract and eval the parsePCPage function
const parseMatch = code.match(/function parsePCPage[\s\S]*?^}/m);
if (parseMatch) {
  eval(parseMatch[0]);

  // Test with the HTML content
  const html = fs.readFileSync(path.join(__dirname, 'test_html.html'), 'utf-8');
  const rows = parsePCPage(html);
  console.log('Parsed', rows.length, 'rows');
  if (rows.length > 0) {
    console.log('First row:', JSON.stringify(rows[0], null, 2));
  }
} else {
  console.log('parsePCPage not found');
}
