const VaultPKIEngine = require('../../src/pki_engine/VaultPKIEngine');
const Constants = require('../../src/constants/Constants');

exports.createContext = async () => {
  console.log('!!!!!!!!!   VAULT CONFIG:   !!!!!!!!!', Constants.vault);
  const pkiEngine = new VaultPKIEngine(Constants.vault);
  await pkiEngine.connect();
  return {
    pkiEngine,
  };
};

exports.destroyContext = (ctx) => {
  ctx.pkiEngine.disconnect();
};
