const { expect } = require('chai');
const { describe, it } = require('mocha');
const constants = require('../../../src/constants/Constants');

describe('Constants', () => {
    it('should have a SERVER object with a PORT property', () => {
        expect(constants).to.have.property('SERVER');
        expect(constants.SERVER).to.have.property('PORT');
    });

    it('should have an OAUTH object with AUTH_ENABLED property', () => {
        expect(constants).to.have.property('OAUTH');
        expect(constants.OAUTH).to.have.property('AUTH_ENABLED');
    });

    it('should have a DATABASE object with DATABASE_HOST property', () => {
        expect(constants).to.have.property('DATABASE');
        expect(constants.DATABASE).to.have.property('DATABASE_HOST');
    });

    it('should have a vault object with endpoint property', () => {
        expect(constants).to.have.property('vault');
        expect(constants.vault).to.have.property('endpoint');
    });

    it('should have a certManager object with enabled property', () => {
        expect(constants).to.have.property('certManager');
        expect(constants.certManager).to.have.property('enabled');
    });

    it('should have an auth object with enabled property', () => {
        expect(constants).to.have.property('auth');
        expect(constants.auth).to.have.property('enabled');
    });

    it('should have a switchFQDN property', () => {
        expect(constants).to.have.property('switchFQDN');
    });

    it('should have a switchId property', () => {
        expect(constants).to.have.property('switchId');
    });

    it('should have clientCsrParameters property', () => {
        expect(constants).to.have.property('clientCsrParameters');
    });

    it('should have serverCsrParameters property', () => {
        expect(constants).to.have.property('serverCsrParameters');
    });

    it('should have caCsrParameters property', () => {
        expect(constants).to.have.property('caCsrParameters');
    });

    it('should have EXTRA_TLS object with EXTRA_CERTIFICATE_CHAIN_FILE_NAME property', () => {
        expect(constants).to.have.property('EXTRA_TLS');
        expect(constants.EXTRA_TLS).to.have.property('EXTRA_CERTIFICATE_CHAIN_FILE_NAME');
    });

    it('should have EXTRA_TLS object with EXTRA_ROOT_CERT_FILE_NAME property', () => {
        expect(constants.EXTRA_TLS).to.have.property('EXTRA_ROOT_CERT_FILE_NAME');
    });

    it('should have AUTH_2FA object with AUTH_2FA_ENABLED property', () => {
        expect(constants).to.have.property('AUTH_2FA');
        expect(constants.AUTH_2FA).to.have.property('AUTH_2FA_ENABLED');
    });

    it('should have AUTH_2FA object with TOTP_ISSUER property', () => {
        expect(constants.AUTH_2FA).to.have.property('TOTP_ISSUER');
    });

    it('should have vault object with mounts property', () => {
        expect(constants.vault).to.have.property('mounts');
    });

    it('should have vault object with pkiServerRole property', () => {
        expect(constants.vault).to.have.property('pkiServerRole');
    });

    it('should have vault object with pkiClientRole property', () => {
        expect(constants.vault).to.have.property('pkiClientRole');
    });

    it('should have vault object with signExpiryHours property', () => {
        expect(constants.vault).to.have.property('signExpiryHours');
    });

    it('should have vault object with keyLength property', () => {
        expect(constants.vault).to.have.property('keyLength');
    });

    it('should have vault object with keyAlgorithm property', () => {
        expect(constants.vault).to.have.property('keyAlgorithm');
    });

    it('should have auth object with creds property', () => {
        expect(constants.auth).to.have.property('creds');
    });

    it('should have auth.creds object with user property', () => {
        expect(constants.auth.creds).to.have.property('user');
    });

    it('should have auth.creds object with pass property', () => {
        expect(constants.auth.creds).to.have.property('pass');
    });
});