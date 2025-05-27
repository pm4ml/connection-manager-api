const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const Constants = require('../../src/constants/Constants');

exports.createContext = async () => {
  console.log(Constants.vault);
  const pkiEngine = new VaultPKIEngine({
    ...Constants.vault,
    signExpiryHours: 1,
  });
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
