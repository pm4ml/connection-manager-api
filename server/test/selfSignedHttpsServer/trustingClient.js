const https = require('https');
const fs = require('fs');

const options = {
  hostname: 'localhost',
  port: 6000,
  path: '/',
  method: 'GET',
  ca: fs.readFileSync('./ca.pem')
};

https.request(options, res => {
  res.on('data', data => {
    process.stdout.write(data);
  });
}).end();
