const Constants = require('../constants/Constants');

const tls = require('tls');
const fs = require('fs');

const addCertsToContextFromFile = (context, filePath) => {
  const pem = fs
    .readFileSync(filePath, { encoding: 'ascii' })
    .replace(/\r\n/g, '\n');

  const certs = pem.match(/-----BEGIN CERTIFICATE-----\n[\s\S]+?\n-----END CERTIFICATE-----/g);

  if (!certs) {
    throw new Error(`enableCustomRootCAs: Could not parse certificate ${filePath}`);
  }

  certs.forEach(cert => {
    context.context.addCACert(cert.trim());
  });
};

let origCreateSecureContext = null;

const enableCustomRootCAs = () => {
  console.log('Enabling custom root CAs and certificate chain options');
  if (origCreateSecureContext) {
    console.log('Custom root CAs was already enabled');
    return;
  }
  origCreateSecureContext = tls.createSecureContext;

  tls.createSecureContext = options => {
    const context = origCreateSecureContext(options);
    if (Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME) {
      addCertsToContextFromFile(context, Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME);
    }
    if (Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME) {
      addCertsToContextFromFile(context, Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME);
    }
    return context;
  };
};

module.exports = {
  enableCustomRootCAs,
};
