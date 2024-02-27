const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const Constants = require('../../src/constants/Constants');

exports.createContext = async () => {
  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect()
    .then(() => { console.log('VAULT is CONNECTED!'); })
    .catch((err) => { console.log(`VAULT is NOT CONNECTED: ${err?.message}`, err); });
  return {
    pkiEngine,
  };
};

exports.destroyContext = (ctx) => {
  ctx.pkiEngine.disconnect();
};
