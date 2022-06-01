const https = require('https');

const options = {
  hostname: 'localhost',
  port: 6000,
  path: '/',
  method: 'GET',
};

process.env.NODE_TLS_REJECT_UNAUTHORIZED = 0;

https.request(options, res => {
  res.on('data', data => {
    process.stdout.write(data);
  });
}).end();
