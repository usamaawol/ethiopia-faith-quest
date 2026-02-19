const http = require('http');
const urls = ['/manifest.json','/sw.js','/'];
const options = { hostname: 'localhost', port: 8081 };
(async ()=>{
  for (const path of urls) {
    await new Promise((resolve) => {
      const req = http.get({ ...options, path }, (res) => {
        console.log('\n----- ' + path + ' -----');
        console.log('status:', res.statusCode);
        res.setEncoding('utf8');
        let out = '';
        res.on('data', (c) => out += c);
        res.on('end', () => { console.log(out.slice(0, 2000)); resolve(); });
      });
      req.on('error', (e) => { console.error('error fetching', path, e.message); resolve(); });
    });
  }
})();
