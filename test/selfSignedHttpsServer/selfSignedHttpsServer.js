const fs = require('fs');
const https = require('https');
const path = require('path');

const server = https.createServer({
  cert: fs.readFileSync(path.join(__dirname, './hub-tls-client.pem')),
  key: fs.readFileSync(path.join(__dirname, './hub-tls-client-key.pem')),
  ca: fs.readFileSync(path.join(__dirname, './ca.pem'))
});

server.on('request', (req, res) => {
  res.writeHead(200);
  res.end('Alive!\n');
});

server.listen(6000);

console.log('Listening...');

module.exports = {
  server
};

// You can validate the certificates are used by doing:
// openssl s_client -connect localhost:6000
