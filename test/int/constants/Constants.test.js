const { expect } = require("chai");
const { describe, it } = require("mocha");
const constants = require("../../../src/constants/Constants");

describe("Constants", () => {
  it("should have a SERVER object with a PORT property", () => {
    expect(constants).to.have.property("SERVER");
    expect(constants.SERVER).to.have.property("PORT");
  });

  it("should have an OAUTH object with AUTH_ENABLED property", () => {
    expect(constants).to.have.property("OAUTH");
    expect(constants.OAUTH).to.have.property("AUTH_ENABLED");
  });

  it("should have a DATABASE object with DATABASE_HOST property", () => {
    expect(constants).to.have.property("DATABASE");
    expect(constants.DATABASE).to.have.property("DATABASE_HOST");
  });

  it("should have a vault object with endpoint property", () => {
    expect(constants).to.have.property("vault");
    expect(constants.vault).to.have.property("endpoint");
  });

  it("should have a certManager object with enabled property", () => {
    expect(constants).to.have.property("certManager");
    expect(constants.certManager).to.have.property("enabled");
  });

  it("should have an auth object with enabled property", () => {
    expect(constants).to.have.property("auth");
    expect(constants.auth).to.have.property("enabled");
  });

  it("should have a switchFQDN property", () => {
    expect(constants).to.have.property("switchFQDN");
  });

  it("should have a switchId property", () => {
    expect(constants).to.have.property("switchId");
  });

  it("should have clientCsrParameters property", () => {
    expect(constants).to.have.property("clientCsrParameters");
  });

  it("should have serverCsrParameters property", () => {
    expect(constants).to.have.property("serverCsrParameters");
  });

  it("should have caCsrParameters property", () => {
    expect(constants).to.have.property("caCsrParameters");
  });

  it("should have EXTRA_TLS object with EXTRA_CERTIFICATE_CHAIN_FILE_NAME property", () => {
    expect(constants).to.have.property("EXTRA_TLS");
    expect(constants.EXTRA_TLS).to.have.property(
      "EXTRA_CERTIFICATE_CHAIN_FILE_NAME"
    );
  });

  it("should have EXTRA_TLS object with EXTRA_ROOT_CERT_FILE_NAME property", () => {
    expect(constants.EXTRA_TLS).to.have.property("EXTRA_ROOT_CERT_FILE_NAME");
  });

  it("should have AUTH_2FA object with AUTH_2FA_ENABLED property", () => {
    expect(constants).to.have.property("AUTH_2FA");
    expect(constants.AUTH_2FA).to.have.property("AUTH_2FA_ENABLED");
  });

  it("should have AUTH_2FA object with TOTP_ISSUER property", () => {
    expect(constants.AUTH_2FA).to.have.property("TOTP_ISSUER");
  });

  it("should have vault object with mounts property", () => {
    expect(constants.vault).to.have.property("mounts");
  });

  it("should have vault object with pkiServerRole property", () => {
    expect(constants.vault).to.have.property("pkiServerRole");
  });

  it("should have vault object with pkiClientRole property", () => {
    expect(constants.vault).to.have.property("pkiClientRole");
  });

  it("should have vault object with signExpiryHours property", () => {
    expect(constants.vault).to.have.property("signExpiryHours");
  });

  it("should have vault object with keyLength property", () => {
    expect(constants.vault).to.have.property("keyLength");
  });

  it("should have vault object with keyAlgorithm property", () => {
    expect(constants.vault).to.have.property("keyAlgorithm");
  });

  it("should have auth object with creds property", () => {
    expect(constants.auth).to.have.property("creds");
  });

  it("should have auth.creds object with user property", () => {
    expect(constants.auth.creds).to.have.property("user");
  });

  it("should have auth.creds object with pass property", () => {
    expect(constants.auth.creds).to.have.property("pass");
  });

  it("should have OAUTH object with correct default roles", () => {
    expect(constants.OAUTH.MTA_ROLE).to.equal("Application/MTA");
    expect(constants.OAUTH.PTA_ROLE).to.equal("Application/PTA");
    expect(constants.OAUTH.EVERYONE_ROLE).to.equal("Internal/everyone");
  });

  it("should have DATABASE object with correct default values", () => {
    expect(constants.DATABASE.DATABASE_HOST).to.equal("localhost");
    expect(constants.DATABASE.DATABASE_PORT).to.equal(3306);
    expect(constants.DATABASE.DATABASE_USER).to.equal("mcm");
    expect(constants.DATABASE.DATABASE_SCHEMA).to.equal("mcm");
    expect(constants.DATABASE.DB_RETRIES).to.equal(10);
  });

  it("should have vault object with correct default endpoints and mounts", () => {
    expect(constants.vault.endpoint).to.equal("http://127.0.0.1:8233");
    expect(constants.vault.mounts.pki).to.equal("pki");
    expect(constants.vault.mounts.intermediatePki).to.equal("pki_int");
    expect(constants.vault.mounts.kv).to.equal("secrets");
  });

  it("should have vault object with correct default key settings", () => {
    expect(constants.vault.keyLength).to.equal(4096);
    expect(constants.vault.keyAlgorithm).to.equal("rsa");
    expect(constants.vault.signExpiryHours).to.equal("43800");
  });

  it("should have certManager disabled by default", () => {
    expect(constants.certManager.enabled).to.equal(false);
  });

  it("should have AUTH_2FA disabled by default", () => {
    expect(constants.AUTH_2FA.AUTH_2FA_ENABLED).to.equal(false);
    expect(constants.AUTH_2FA.TOTP_ISSUER).to.equal("MCM");
  });

  it("should have correct default switch settings", () => {
    expect(constants.switchFQDN).to.equal("switch.example.com");
    expect(constants.switchId).to.exist;
  });

  it("should have required vault authentication properties", () => {
    expect(constants.vault.auth).to.be.an("object");
    if (constants.vault.auth.k8s) {
      expect(constants.vault.auth.k8s).to.have.property("mountPoint");
      expect(constants.vault.auth.k8s).to.have.property("role");
    } else if (constants.vault.auth.appRole) {
      expect(constants.vault.auth.appRole).to.have.property("roleId");
      expect(constants.vault.auth.appRole).to.have.property("roleSecretId");
    }
  });

  it("should have OAUTH object with JWT cookie name", () => {
    expect(constants.OAUTH).to.have.property("JWT_COOKIE_NAME");
    expect(constants.OAUTH.JWT_COOKIE_NAME).to.equal("MCM-API_ACCESS_TOKEN");
  });

  it("should have OAUTH object with reset password configuration", () => {
    expect(constants.OAUTH).to.have.property("RESET_PASSWORD_ISSUER");
    expect(constants.OAUTH).to.have.property("RESET_PASSWORD_AUTH_USER");
    expect(constants.OAUTH).to.have.property("RESET_PASSWORD_AUTH_PASSWORD");
  });

  // Database retry settings
  it("should have DATABASE object with retry configuration", () => {
    expect(constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS).to.equal(
      1000
    );
    expect(constants.DATABASE.DB_RETRIES).to.be.a("number");
  });

  // Advanced AUTH_2FA validations
  it("should have complete AUTH_2FA WSO2 configuration", () => {
    expect(constants.AUTH_2FA).to.have.property("WSO2_MANAGER_SERVICE_URL");
    expect(constants.AUTH_2FA).to.have.property("WSO2_MANAGER_SERVICE_USER");
    expect(constants.AUTH_2FA).to.have.property(
      "WSO2_MANAGER_SERVICE_PASSWORD"
    );
  });

  it("should have AUTH_2FA TOTP admin configuration", () => {
    expect(constants.AUTH_2FA).to.have.property("TOTP_ADMIN_ISSUER");
    expect(constants.AUTH_2FA).to.have.property("TOTP_ADMIN_AUTH_USER");
    expect(constants.AUTH_2FA).to.have.property("TOTP_ADMIN_AUTH_PASSWORD");
    expect(constants.AUTH_2FA).to.have.property("TOTP_LABEL");
  });

  // Vault DFSP bundle configurations
  it("should have vault mounts with DFSP bundle configurations", () => {
    expect(constants.vault.mounts).to.have.property("dfspClientCertBundle");
    expect(constants.vault.mounts).to.have.property(
      "dfspInternalIPWhitelistBundle"
    );
    expect(constants.vault.mounts).to.have.property(
      "dfspExternalIPWhitelistBundle"
    );
    expect(constants.vault.mounts.dfspClientCertBundle).to.equal(
      "onboarding_pm4mls"
    );
    expect(constants.vault.mounts.dfspInternalIPWhitelistBundle).to.equal(
      "whitelist_pm4mls"
    );
    expect(constants.vault.mounts.dfspExternalIPWhitelistBundle).to.equal(
      "whitelist_fsps"
    );
  });

  // Server configuration
  it("should have SERVER with default port configuration", () => {
    expect(constants.SERVER.PORT).to.equal(3001);
  });

  it("should have OAUTH object with certificate configuration", () => {
    expect(constants.OAUTH).to.have.property("CERTIFICATE_FILE_NAME");
    expect(constants.OAUTH).to.have.property("EMBEDDED_CERTIFICATE");
    expect(constants.OAUTH.CERTIFICATE_FILE_NAME).to.equal(
      "resources/wso2carbon-publickey.cert"
    );
  });

  it("should have OAUTH object with OAuth2 configuration", () => {
    expect(constants.OAUTH).to.have.property("OAUTH2_ISSUER");
    expect(constants.OAUTH).to.have.property("OAUTH2_TOKEN_ISS");
    expect(constants.OAUTH.OAUTH2_ISSUER).to.equal(
      "https://WSO2_IM_SERVER:9443/oauth2/token"
    );
  });

  it("should have OAUTH object with client credentials", () => {
    expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_KEY");
    expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_SECRET");
  });

  // Database extended validations
  it("should have DATABASE object with credentials", () => {
    expect(constants.DATABASE).to.have.property("DATABASE_USER");
    expect(constants.DATABASE).to.have.property("DATABASE_PASSWORD");
    expect(constants.DATABASE.DATABASE_PASSWORD).to.equal("mcm");
  });

  // Vault extended validations
  it("should have vault PKI mounts configuration", () => {
    expect(constants.vault.mounts.pki).to.equal("pki");
    expect(constants.vault.mounts.intermediatePki).to.equal("pki_int");
  });

  // Cert Manager extended validations
  it("should have certManager with secret configurations when enabled", () => {
    if (constants.certManager.enabled) {
      expect(constants.certManager).to.have.property("serverCertSecretName");
      expect(constants.certManager).to.have.property(
        "serverCertSecretNamespace"
      );
    }
  });

  // Database connection configuration tests
  it("should have complete database connection configuration", () => {
    expect(constants.DATABASE).to.include.all.keys([
      "DATABASE_HOST",
      "DATABASE_PORT",
      "DATABASE_USER",
      "DATABASE_PASSWORD",
      "DATABASE_SCHEMA",
      "DB_RETRIES",
      "DB_CONNECTION_RETRY_WAIT_MILLISECONDS"
    ]);

    expect(constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS).to.be.a(
      "number"
    );
    expect(
      constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS
    ).to.be.greaterThan(0);
  });

  // Vault auth configuration tests
  it("should have proper vault authentication configuration", () => {
    expect(constants.vault.auth).to.be.an("object");
    if (process.env.VAULT_AUTH_METHOD === "K8S") {
      expect(constants.vault.auth.k8s).to.include.all.keys([
        "token",
        "mountPoint",
        "role"
      ]);
    } else if (process.env.VAULT_AUTH_METHOD === "APP_ROLE") {
      expect(constants.vault.auth.appRole).to.include.all.keys([
        "roleId",
        "roleSecretId"
      ]);
    }
  });

  // OAuth token configuration tests
  it("should have complete OAuth token configuration", () => {
    expect(constants.OAUTH).to.have.property("JWT_COOKIE_NAME");
    expect(constants.OAUTH.JWT_COOKIE_NAME).to.be.a("string");
    expect(constants.OAUTH.JWT_COOKIE_NAME).to.equal("MCM-API_ACCESS_TOKEN");

    if (constants.OAUTH.AUTH_ENABLED) {
      expect(constants.OAUTH).to.have.property("OAUTH2_TOKEN_ISS");
      expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_KEY");
      expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_SECRET");
    }
  });

  // Password reset configuration tests
  it("should have complete password reset configuration when OAuth is enabled", () => {
    if (constants.OAUTH.AUTH_ENABLED) {
      expect(constants.OAUTH.RESET_PASSWORD_ISSUER).to.be.a("string");
      expect(constants.OAUTH.RESET_PASSWORD_AUTH_USER).to.be.a("string");
      expect(constants.OAUTH.RESET_PASSWORD_AUTH_PASSWORD).to.be.a("string");
    }
  });

  it("should have OAUTH object with certificate configuration", () => {
    expect(constants.OAUTH).to.have.property("CERTIFICATE_FILE_NAME");
    expect(constants.OAUTH).to.have.property("EMBEDDED_CERTIFICATE");
    expect(constants.OAUTH.CERTIFICATE_FILE_NAME).to.equal(
      "resources/wso2carbon-publickey.cert"
    );
  });

  it("should have OAUTH object with OAuth2 configuration", () => {
    expect(constants.OAUTH).to.have.property("OAUTH2_ISSUER");
    expect(constants.OAUTH).to.have.property("OAUTH2_TOKEN_ISS");
    expect(constants.OAUTH.OAUTH2_ISSUER).to.equal(
      "https://WSO2_IM_SERVER:9443/oauth2/token"
    );
  });

  it("should have OAUTH object with client credentials", () => {
    expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_KEY");
    expect(constants.OAUTH).to.have.property("APP_OAUTH_CLIENT_SECRET");
  });

  // Database extended validations
  it("should have DATABASE object with credentials", () => {
    expect(constants.DATABASE).to.have.property("DATABASE_USER");
    expect(constants.DATABASE).to.have.property("DATABASE_PASSWORD");
    expect(constants.DATABASE.DATABASE_PASSWORD).to.equal("mcm");
  });

  // Vault extended validations
  it("should have vault PKI mounts configuration", () => {
    expect(constants.vault.mounts.pki).to.equal("pki");
    expect(constants.vault.mounts.intermediatePki).to.equal("pki_int");
  });

  // Cert Manager extended validations
  it("should have certManager with secret configurations when enabled", () => {
    if (constants.certManager.enabled) {
      expect(constants.certManager).to.have.property("serverCertSecretName");
      expect(constants.certManager).to.have.property(
        "serverCertSecretNamespace"
      );
    }
  });
});
