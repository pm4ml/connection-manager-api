const https = require('https');

const options = {
  hostname: 'localhost',
  port: 6000,
  path: '/',
  method: 'GET',
};

// Doesn't work, needs to be set BEFORE starting node
process.env.NODE_EXTRA_CA_CERTS = './ca.pem';
console.log(process.env.NODE_EXTRA_CA_CERTS);

https.request(options, res => {
  res.on('data', data => {
    process.stdout.write(data);
  });
}).end();
