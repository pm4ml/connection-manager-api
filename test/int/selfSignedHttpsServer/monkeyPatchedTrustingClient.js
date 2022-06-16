const https = require('https');
const tls = require('tls');
const fs = require('fs');
const path = require('path');

const origCreateSecureContext = tls.createSecureContext;

const ROOT_CERTIFICATE_PATH = './ca.pem';

tls.createSecureContext = options => {
  const context = origCreateSecureContext(options);

  const pem = fs
    .readFileSync(path.join(__dirname, ROOT_CERTIFICATE_PATH), { encoding: 'ascii' })
    .replace(/\r\n/g, '\n');

  const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);

  if (!certs) {
    throw new Error(`Could not parse certificate ${ROOT_CERTIFICATE_PATH}`);
  }

  certs.forEach(cert => {
    context.context.addCACert(cert.trim());
  });

  return context;
};

const options = {
  hostname: 'localhost',
  port: 6000,
  path: '/',
  method: 'GET',
};

https.request(options, res => {
  res.on('data', data => {
    process.stdout.write(data);
  });
}).end();
