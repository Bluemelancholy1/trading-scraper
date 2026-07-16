const fs = require('fs');
const VER = '1.0.26';
const path = require('path');

// package.json
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.version = VER;
fs.writeFileSync('package.json', JSON.stringify(pkg,null,2) + '\n');
console.log('package.json ->', VER);

// proxy-server.js
let s = fs.readFileSync('proxy-server.js','utf8');
s = s.replace(/const APP_VERSION = '[^']+';/, "const APP_VERSION = '" + VER + "';");
fs.writeFileSync('proxy-server.js', s);
console.log('proxy-server.js APP_VERSION ->', VER);

// remote-config.json
const r = JSON.parse(fs.readFileSync('remote-config.json','utf8'));
r.latestVersion = VER;
fs.writeFileSync('remote-config.json', JSON.stringify(r,null,2));
console.log('remote-config.json ->', VER);
