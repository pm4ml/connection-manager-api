const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const Constants = require('../../src/constants/Constants');

exports.createContext = async () => {
  const pkiEngine = new VaultPKIEngine({
    ...Constants.vault,
    signExpiryHours: 1,
  });
  await pkiEngine.connect()
    .then(() => { console.log('VAULT is CONNECTED!'); })
    .catch((err) => { console.error(`VAULT is NOT CONNECTED: ${err?.message}`, err); });
  return {
    pkiEngine,
  };
};

exports.destroyContext = (ctx) => {
  ctx.pkiEngine.disconnect();
};
