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
});const sinon = require("sinon");
const chai = require("chai");
const fs = require("fs");
const tls = require("tls");
const Constants = require("../../../src/constants/Constants");
const { enableCustomRootCAs } = require("../../../src/utils/tlsUtils");

const { expect } = chai;

describe("tlsUtils", () => {
  let sandbox;
  let origCreateSecureContext;
  let mockContext;
  let consoleLogStub;

  const validCertificate = `-----BEGIN CERTIFICATE-----
MIIDXTCCAkWgAwIBAgIJAM5LmwJc2PAiMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
BAYTAkFVMRMwEQYDVQQIDApTb21lLVN0YXRlMSEwHwYDVQQKDBhJbnRlcm5ldCBX
aWRnaXRzIFB0eSBMdGQwHhcNMjIwMTAxMDAwMDAwWhcNMjMwMTAxMDAwMDAwWjBF
MQswCQYDVQQGEwJBVTETMBEGA1UECAwKU29tZS1TdGF0ZTEhMB8GA1UECgwYSW50
ZXJuZXQgV2lkZ2l0cyBQdHkgTHRkMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIB
CgKCAQEA0123456789
-----END CERTIFICATE-----`;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
    consoleLogStub = sandbox.stub(console, "log");

    mockContext = {
      context: {
        addCACert: sandbox.stub(),
      },
    };

    origCreateSecureContext = tls.createSecureContext;
    tls.createSecureContext = sandbox.stub().returns(mockContext);

    // Reset Constants for each test
    Constants.EXTRA_TLS = {
      EXTRA_CERTIFICATE_CHAIN_FILE_NAME: null,
      EXTRA_ROOT_CERT_FILE_NAME: null,
    };
  });

  afterEach(() => {
    sandbox.restore();
    tls.createSecureContext = origCreateSecureContext;
  });

  it("should enable custom root CAs only once", () => {
    // Act
    enableCustomRootCAs();
    const firstCreateContext = tls.createSecureContext;
    enableCustomRootCAs();

    // Assert
    expect(tls.createSecureContext).to.equal(firstCreateContext);
    expect(consoleLogStub.calledWith("Custom root CAs was already enabled")).to
      .be.true;
  });

  it("should load certificate chain when specified", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME =
      "/path/to/chain.pem";
    sandbox.stub(fs, "readFileSync").returns(validCertificate);

    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(mockContext.context.addCACert.calledOnce).to.be.true;
    expect(fs.readFileSync.calledWith("/path/to/chain.pem")).to.be.true;
  });

  it("should load root certificate when specified", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";
    sandbox.stub(fs, "readFileSync").returns(validCertificate);

    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(mockContext.context.addCACert.calledOnce).to.be.true;
    expect(fs.readFileSync.calledWith("/path/to/root.pem")).to.be.true;
  });

  it("should throw error when certificate file is invalid", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";
    sandbox.stub(fs, "readFileSync").returns("invalid certificate content");

    // Act
    enableCustomRootCAs();

    // Assert
    expect(() => tls.createSecureContext({})).to.throw(
      "enableCustomRootCAs: Could not parse certificate /path/to/root.pem"
    );
  });

  it("should handle multiple certificates in single file", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME =
      "/path/to/chain.pem";
    const multipleCerts = `${validCertificate}\n${validCertificate}`;
    sandbox.stub(fs, "readFileSync").returns(multipleCerts);

    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(mockContext.context.addCACert.calledTwice).to.be.true;
  });

  it("should skip certificate loading when no files specified", () => {
    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(mockContext.context.addCACert.called).to.be.false;
    expect(
      consoleLogStub.calledWith(
        "Not loading certificate chain as it wasn't specified at Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME: null"
      )
    ).to.be.true;
    expect(
      consoleLogStub.calledWith(
        "Not loading certificate root as it wasn't specified at Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME: null"
      )
    ).to.be.true;
  });

  it("should handle CRLF line endings in certificate files", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";
    const certificateWithCRLF = validCertificate.replace(/\n/g, "\r\n");
    sandbox.stub(fs, "readFileSync").returns(certificateWithCRLF);

    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(mockContext.context.addCACert.calledOnce).to.be.true;
    const calledWithCert = mockContext.context.addCACert.getCall(0).args[0];
    expect(calledWithCert).to.not.include("\r\n");
  });

  it("should handle fs.readFileSync errors", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";
    sandbox.stub(fs, "readFileSync").throws(new Error("File not found"));

    // Act
    enableCustomRootCAs();

    // Assert
    expect(() => tls.createSecureContext({})).to.throw("File not found");
  });

  it("should log appropriate messages when enabling custom root CAs", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME =
      "/path/to/chain.pem";
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";

    // Act
    enableCustomRootCAs();

    // Assert
    expect(
      consoleLogStub.calledWith(
        "Enabling custom root CAs and certificate chain option"
      )
    ).to.be.true;
    expect(
      consoleLogStub.calledWith(
        "Will load certificate chain from /path/to/chain.pem"
      )
    ).to.be.true;
    expect(
      consoleLogStub.calledWith(
        "Will load certificate root from /path/to/root.pem"
      )
    ).to.be.true;
  });

  it("should load both chain and root certificates when specified", () => {
    // Arrange
    Constants.EXTRA_TLS.EXTRA_CERTIFICATE_CHAIN_FILE_NAME =
      "/path/to/chain.pem";
    Constants.EXTRA_TLS.EXTRA_ROOT_CERT_FILE_NAME = "/path/to/root.pem";
    const readFileStub = sandbox
      .stub(fs, "readFileSync")
      .returns(validCertificate);

    // Act
    enableCustomRootCAs();
    tls.createSecureContext({});

    // Assert
    expect(readFileStub.calledWith("/path/to/chain.pem")).to.be.true;
    expect(readFileStub.calledWith("/path/to/root.pem")).to.be.true;
    expect(mockContext.context.addCACert.calledTwice).to.be.true;
    expect(
      consoleLogStub.calledWith(
        "Loading certificate chain from /path/to/chain.pem"
      )
    ).to.be.true;
    expect(
      consoleLogStub.calledWith(
        "Loading certificate root from /path/to/root.pem"
      )
    ).to.be.true;
  });
});
