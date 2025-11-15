const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const Constants = require('../../src/constants/Constants');
const { logger } = require('../../src/log/logger');

exports.createContext = async () => {
  const pkiEngine = new VaultPKIEngine({
    ...Constants.vault,
    signExpiryHours: 1,
  });
  await pkiEngine.connect()
    .then(() => { logger.debug('VAULT is CONNECTED!'); })
    .catch((err) => { logger.error(`VAULT is NOT CONNECTED: ${err?.message}`, err); });
  return {
    pkiEngine,
  };
};

exports.destroyContext = (ctx) => {
  ctx.pkiEngine.disconnect();
};
