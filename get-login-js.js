const https = require('https');
const http = require('http');

function fetch(url, cookie) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const lib = u.protocol === 'https:' ? https : http;
    const req = lib.request({hostname:u.hostname,port:u.port||443,path:u.pathname+u.search,headers:{'User-Agent':'Mozilla/5.0','Cookie':cookie||'','Referer':'https://nbqh.lulutong.club/'}},res=>{
      let d='';res.on('data',c=>d+=c);res.on('end',()=>resolve({status:res.statusCode,body:d,cookie:res.headers['set-cookie']}));
    });
    req.on('error',reject);req.setTimeout(12000,()=>{req.destroy();reject(new Error('timeout'));});req.end();
  });
}

async function main() {
  // Get room cookie
  await fetch('https://nbqh.lulutong.club/');
  const c = await fetch('https://nbqh.lulutong.club/Handle/CheckRoomPass.asp?ac=CheckRoomPass&RID=7000&P=881199');
  const cookieStr = (c.cookie||[]).map(x=>x.split(';')[0]).join('; ');

  // Fetch base.js with cookie
  const r = await fetch('https://nbqh.lulutong.club/static/js/base.js?v=20200815v18&domain=&20180205', cookieStr);
  console.log('base.js status:', r.status, 'len:', r.body.length);
  if (r.body.length > 10) {
    const lines = r.body.split('\n');
    lines.forEach((l,i) => {
      if (/showLogin|showReg|btnLogin|Reg\.Show|Reg\.show|login|reg|loginUrl/i.test(l)) {
        console.log('LINE', i+1, ':', l.trim().substring(0,200));
      }
    });
  } else {
    // Try main.js
    const m = await fetch('https://nbqh.lulutong.club/static/js/main.js?v=20200815v18', cookieStr);
    console.log('main.js status:', m.status, 'len:', m.body.length);
    if (m.body.length > 10) {
      const lines = m.body.split('\n');
      lines.forEach((l,i) => {
        if (/showLogin|showReg|btnLogin|login|reg/i.test(l)) {
          console.log('LINE', i+1, ':', l.trim().substring(0,200));
        }
      });
    }
    // Try api.js
    const a = await fetch('https://nbqh.lulutong.club/static/js/api.js?v=20200815v18', cookieStr);
    console.log('api.js status:', a.status, 'len:', a.body.length);
  }
}
main().catch(e=>console.log('ERR:',e.message));
