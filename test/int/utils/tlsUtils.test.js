const sinon = require("sinon");
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
