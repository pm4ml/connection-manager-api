const https = require('https');
const fs = require('fs');
const path = require('path');

const ROOT_CERTIFICATE_PATH = './ca.pem';

const options = {
  hostname: 'localhost',
  port: 6000,
  path: '/',
  method: 'GET',
  ca: fs.readFileSync(path.join(__dirname, ROOT_CERTIFICATE_PATH))
};

https.request(options, res => {
  res.on('data', data => {
    process.stdout.write(data);
  });
}).end();
