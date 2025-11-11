const tmp = require('tmp');
const { randomUUID } = require('node:crypto');
const fs = require('fs');

const createTemp = (content) => {
  const tempFile = tmp.fileSync({ discardDescriptor: true, keep: false });
  fs.writeFileSync(tempFile.name, content);
  return tempFile.name;
};

process.env.VAULT_ROLE_ID_FILE = createTemp(randomUUID());
process.env.VAULT_ROLE_SECRET_ID_FILE = createTemp(randomUUID());
