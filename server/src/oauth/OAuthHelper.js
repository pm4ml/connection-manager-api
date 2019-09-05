const PkiService = require('../service/PkiService');
const Cookies = require('cookies');
const Constants = require('../constants/Constants');
const fs = require('fs');
const path = require('path');

function cookieExtractor (req) {
  let cookies = new Cookies(req);
  let token = cookies.get(Constants.OAUTH.JWT_COOKIE_NAME);
  return token;
};

/**
 * Creates a JWTStrategy to use with passport
 */
function createJwtStrategy () {
  var JwtStrategy = require('passport-jwt').Strategy;
  var ExtractJwt = require('passport-jwt').ExtractJwt;

  var jwtStrategyOpts = {};
  jwtStrategyOpts.jwtFromRequest = ExtractJwt.fromExtractors([ExtractJwt.fromAuthHeaderAsBearerToken(), cookieExtractor]);

  jwtStrategyOpts.passReqToCallback = true;
  jwtStrategyOpts.jsonWebTokenOptions = {};
  let certContent;
  if (Constants.OAUTH.EMBEDDED_CERTIFICATE) {
    console.log('Setting certificate from Constants.OAUTH.EMBEDDED_CERTIFICATE');
    certContent = Constants.OAUTH.EMBEDDED_CERTIFICATE;
  } else {
    console.log(`Setting certificate from Constants.OAUTH.CERTIFICATE_FILE_NAME: ${Constants.OAUTH.CERTIFICATE_FILE_NAME}`);
    certContent = Constants.OAUTH.EMBEDDED_CERTIFICATE || fs.readFileSync(path.join(__dirname, '..', Constants.OAUTH.CERTIFICATE_FILE_NAME), 'utf8');
  }
  jwtStrategyOpts.secretOrKeyProvider = (request, rawJwtToken, done) => {
    done(null, certContent);
  };
  // jwtStrategyOpts.issuer = 'accounts.examplesoft.com';
  jwtStrategyOpts.audience = Constants.OAUTH.APP_OAUTH_CLIENT_KEY;
  let jwtStrategy = new JwtStrategy(jwtStrategyOpts, verifyCallback);
  return jwtStrategy;
}

/**
 * Verifies the basic jwtPayload parameters, whatever it is needed before checking for the specific permissions
 * requested by the req
 *
 * This validates the issuer, sub, that the jwt has groups, and the creates a client and authInfo and calls the callback
 *
 * @param {Request} req http request
 * @param {Object} jwtPayload JWT Payload as an Object
 * @param {function(err, client|false, authInfo)} done callback called with the verification results
 */
function verifyCallback (req, jwtPayload, done) {
  if (!jwtPayload.sub) {
    return done(null, false, 'Invalid Authentication info: no sub');
  }
  if (!jwtPayload.iss) {
    return done(null, false, 'Invalid Authentication info: no iss');
  }
  let issuer = jwtPayload.iss;
  if (issuer !== Constants.OAUTH.OAUTH2_ISSUER) {
    return done(null, false, `Invalid Authentication: wrong issuer ${issuer}`);
  }
  if (!jwtPayload.groups) {
    return done(null, false, 'Invalid Authentication info: no groups');
  }
  console.log(`verifyCallback: user ${jwtPayload.sub} with roles ${jwtPayload.groups}`);
  let foundMTA = jwtPayload.groups.includes(Constants.OAUTH.MTA_ROLE);
  let foundPTA = jwtPayload.groups.includes(Constants.OAUTH.PTA_ROLE);
  let foundEveryone = jwtPayload.groups.includes(Constants.OAUTH.EVERYONE_ROLE);
  let client = null;
  client = { name: jwtPayload.sub };
  let roles = { mta: foundMTA, pta: foundPTA, everyone: foundEveryone };
  for (const group of jwtPayload.groups) {
    roles[group] = true;
  }
  let authInfo = { roles: roles };
  return done(null, client, authInfo);
}

/**
 * Creates a passport OAUth2 authenticating middleware
 *
 * @returns a connect middleware that handles OAuth2
 */
function getOAuth2Middleware () {
  var passport = require('passport');
  let jwtStrategy = createJwtStrategy();
  passport.use(jwtStrategy);
  return (req, res, next) => {
    passport.authenticate('jwt', { session: false })(req, res, next); // failWithError: true returns awful html error. , failureMessage: true  eats the message
  };
}

/**
 * Validates that the user has the required permissions to execute the operation.
 *
 * callback accepts one
 * argument - an Error if unauthorized. The Error may include "message",
 * "state", and "code" fields to be conveyed to the client in the response
 * body and a "headers" field containing an object representing headers
 * to be set on the response to the client. In addition, if the Error has
 * a statusCode field, the response statusCode will be set to match -
 * otherwise, the statusCode will be set to 403.
 *
 * @param {Request} req HTTP request. req.user and req.authInfo come from the passport verify callback (`return done(null, client, authInfo)`)
 * @param {SecurityDefiniton} securityDefinition SecurityDefiniton from the swagger doc
 * @param {String} scopes scopes required for this operation; from the operation definition in the Swagger doc. Same as req.swagger.security[0].OAuth2
 * @param {(error)} callback function to call with the result. If unauthorized, send the error.
 */
function oauth2PermissionsVerifier (req, securityDefinition, scopes, callback) {
  // console.log(req, securityDefinition, scopes, callback);
  let user = req.user;
  let authInfo = req.authInfo;
  let apiPath = req.swagger.apiPath;
  let originalUrl = req.originalUrl;
  console.log('oauth2PermissionsVerifier: user', user, 'roles/groups: ', authInfo, ' resource: ', originalUrl, ' apiPath: ', apiPath);

  // Now check that the user has all the roles(scopes)
  let rolesOk = false;
  if (scopes && Array.isArray(scopes)) {
    for (const scope of scopes) {
      rolesOk = rolesOk || authInfo.roles[scope]; // FIXME Here should be an && since they are all required per definition. Need to review the roles ( like pta should include mta )
    }
  }
  let error = null;
  if (!rolesOk) {
    console.log(`API defined scopes: user ${JSON.stringify(user)} does not have the required roles ${JSON.stringify(scopes)}, it has roles ${JSON.stringify(authInfo.roles)}`);
    error = new Error(`user does not have the required roles ${scopes}`);
    error.statusCode = 403;
    error.headers = { 'X-AUTH-ERROR': error.message };
    return callback(error);
  }

  if (authInfo.roles.pta) {
    // if PTA, has access to all the DFSPs info
    callback();
    return;
  }
  // Now check specific object access permissions
  // DFSP
  // /\/api\/environments\/(\S*)\/dfsps\/(\S*)/.test(originalUrl))  // doesn't work on http://localhost:3001/api/environments/4/dfsps/jwscerts
  // /environments/{envId}/dfsps/jwscerts, /environments/{envId}/dfsps/{dfspId}/ca:
  if (/\/environments\/{envId}\/dfsps\/{dfspId}/.test(apiPath)) {
    var envId = req.swagger.params['envId'].value;
    var dfspId = req.swagger.params['dfspId'].value;
    PkiService.getDFSPById(envId, dfspId)
      .then(dfsp => {
        let groups = authInfo.roles ? authInfo.roles : {};
        if (!dfsp.securityGroup || groups[dfsp.securityGroup]) {
          callback();
        } else {
          console.log(`DFSP specific scopes: user ${JSON.stringify(user)} does not have the required roles ${JSON.stringify(dfsp.securityGroup)}, it has roles ${JSON.stringify(groups)}`);
          error = new Error(`user does not have the required role ${dfsp.securityGroup}`);
          error.statusCode = 403;
          error.headers = { 'X-AUTH-ERROR': error.message };
          callback(error);
        }
      })
      .catch(err => {
        error = new Error(err.message);
        error.statusCode = 500;
        error.headers = { 'X-AUTH-ERROR': error.message };
        callback(error);
      });
  } else {
    callback(error);
  }
};

module.exports = {
  getOAuth2Middleware,
  oauth2PermissionsVerifier,
};
