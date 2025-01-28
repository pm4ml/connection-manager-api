const chai = require('chai');
const sinon = require('sinon');
const tls = require('tls');
const fs = require('fs');
const Constants = require('../../../src/constants/Constants');
const { enableCustomRootCAs } = require('../../../src/utils/tlsUtils');

const { expect } = chai;

describe('tlsUtils', () => {
    let readFileSyncStub;
    let createSecureContextStub;
    let addCACertStub;
    let origCreateSecureContext;

    beforeEach(() => {
        readFileSyncStub = sinon.stub(fs, 'readFileSync');
        createSecureContextStub = sinon.stub(tls, 'createSecureContext').callsFake(() => ({
            context: {
                addCACert: addCACertStub = sinon.stub()
            }
        }));
        origCreateSecureContext = tls.createSecureContext;
    });

    afterEach(() => {
        sinon.restore();
    });

    describe('enableCustomRootCAs', () => {
        it('should enable custom root CAs and certificate chain option', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledTwice).to.be.true;
            expect(addCACertStub.firstCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            expect(addCACertStub.secondCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');
        });

        it('should not load certificate chain if not specified', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: null,
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledOnce).to.be.true;
            expect(addCACertStub.firstCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');
        });

        it('should not load root certificate if not specified', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: null
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledOnce).to.be.true;
            expect(addCACertStub.firstCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
        });

        it('should throw an error if certificate cannot be parsed', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'invalid.pem',
                EXTRA_ROOT_CERT_FILE_NAME: null
            };

            readFileSyncStub.withArgs('invalid.pem').returns('invalid certificate content');

            expect(() => enableCustomRootCAs()).to.throw('enableCustomRootCAs: Could not parse certificate invalid.pem');
        });

        it('should not enable custom root CAs if already enabled', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();
            enableCustomRootCAs(); // Call it again

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledTwice).to.be.true;
        });

        it('should handle empty EXTRA_TLS configuration gracefully', () => {
            Constants.EXTRA_TLS = {};

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });

        it('should handle missing EXTRA_TLS configuration gracefully', () => {
            Constants.EXTRA_TLS = null;

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });

        it('should restore original createSecureContext after enabling custom root CAs', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();
            tls.createSecureContext = origCreateSecureContext;

            expect(tls.createSecureContext).to.equal(origCreateSecureContext);
        });

        it('should log appropriate messages when enabling custom root CAs', () => {
            const consoleLogStub = sinon.stub(console, 'log');
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(consoleLogStub.calledWith('Enabling custom root CAs and certificate chain option')).to.be.true;
            expect(consoleLogStub.calledWith('Will load certificate chain from chain.pem')).to.be.true;
            expect(consoleLogStub.calledWith('Will load certificate root from root.pem')).to.be.true;

            consoleLogStub.restore();
        });

        it('should log appropriate messages when custom root CAs are already enabled', () => {
            const consoleLogStub = sinon.stub(console, 'log');
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();
            enableCustomRootCAs(); // Call it again

            expect(consoleLogStub.calledWith('Custom root CAs was already enabled')).to.be.true;

            consoleLogStub.restore();
        });

        // Additional tests to cover the missing lines
        it('should handle case when EXTRA_TLS is undefined', () => {
            delete Constants.EXTRA_TLS;

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });

        it('should handle case when EXTRA_TLS has invalid file names', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'nonexistent_chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'nonexistent_root.pem'
            };

            readFileSyncStub.withArgs('nonexistent_chain.pem').throws(new Error('File not found'));
            readFileSyncStub.withArgs('nonexistent_root.pem').throws(new Error('File not found'));

            expect(() => enableCustomRootCAs()).to.throw('File not found');
        });

        it('should handle case when EXTRA_TLS has both chain and root certificates as null', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: null,
                EXTRA_ROOT_CERT_FILE_NAME: null
            };

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });

        it('should handle case when EXTRA_TLS has only chain certificate', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: null
            };

            readFileSyncStub.withArgs('chain.pem').returns('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledOnce).to.be.true;
            expect(addCACertStub.firstCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----');
        });

        it('should handle case when EXTRA_TLS has only root certificate', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: null,
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('root.pem').returns('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.calledOnce).to.be.true;
            expect(addCACertStub.firstCall.args[0]).to.equal('-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----');
        });

        it('should handle case when EXTRA_TLS has invalid certificate content', () => {
            Constants.EXTRA_TLS = {
                EXTRA_CERTIFICATE_CHAIN_FILE_NAME: 'chain.pem',
                EXTRA_ROOT_CERT_FILE_NAME: 'root.pem'
            };

            readFileSyncStub.withArgs('chain.pem').returns('invalid certificate content');
            readFileSyncStub.withArgs('root.pem').returns('invalid certificate content');

            expect(() => enableCustomRootCAs()).to.throw('enableCustomRootCAs: Could not parse certificate chain.pem');
        });

        it('should handle case when EXTRA_TLS is an empty object', () => {
            Constants.EXTRA_TLS = {};

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });

        it('should handle case when EXTRA_TLS is null', () => {
            Constants.EXTRA_TLS = null;

            enableCustomRootCAs();

            expect(createSecureContextStub.calledOnce).to.be.true;
            expect(addCACertStub.called).to.be.false;
        });
    });
});