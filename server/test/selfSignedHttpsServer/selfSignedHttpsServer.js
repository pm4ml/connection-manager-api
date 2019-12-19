const fs = require('fs');
const https = require('https');

const server = https.createServer({
  cert: fs.readFileSync('./hub-tls-client.pem'),
  key: fs.readFileSync('./hub-tls-client-key.pem'),
  ca: fs.readFileSync('./ca.pem')
});

server.on('request', (req, res) => {
  res.writeHead(200);
  res.end('Alive!\n');
});

server.listen(6000);

console.log('Listening...');

// You can validate the certificates are used by doing:
// openssl s_client -connect localhost:6000
