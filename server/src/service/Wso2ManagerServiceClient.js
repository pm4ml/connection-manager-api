const soap = require('soap');
const path = require('path');
const ExternalProcessError = require('../errors/ExternalProcessError');
const Constants = require('../constants/Constants');

const URL = Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_URL;
const USER = Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_USER;
const PASS = Constants.AUTH_2FA.WSO2_MANAGER_SERVICE_PASSWORD;

/**
 * Returns a claim of the user, if not find returns null
 */
exports.getUserClaimValue = (userName, claim) => {
  soap.createClient(path.join(__dirname, '/../wsdl/RemoteUserStoreManagerService.wsdl'), (err, client) => {
    if (err) {
      throw new ExternalProcessError('error creating WSDL Client', err);
    }
    client.setSecurity(new soap.BasicAuthSecurity(USER, PASS));
    client.setEndpoint(URL);
    client.getUserClaimValue({ userName, claim }, (err, result) => {
      if (err) {
        throw new ExternalProcessError('error calling getUserClaimValue', err);
      }
      let _result = null;
      if (result.getUserClaimValueResponse) {
        _result = result.getUserClaimValueResponse.return;
      }
      return _result;
    });
  });
};

/**
 * set a claim value to a user
 */
exports.setUserClaimValue = (userName, claim, value) => {
  soap.createClient(path.join(__dirname, '/../wsdl/RemoteUserStoreManagerService.wsdl'), (err, client) => {
    if (err) {
      throw new ExternalProcessError('error creating WSDL Client', err);
    }
    client.setSecurity(new soap.BasicAuthSecurity(USER, PASS));
    client.setEndpoint(URL);
    client.setUserClaimValue({ userName, claimURI: claim, claimValue: value }, (err, result) => {
      if (err) {
        throw new ExternalProcessError('error calling setUserClaimValue', err);
      }
    });
  });
};
