const sinon = require("sinon");
const tls = require("tls");
const fs = require("fs");
const Constants = require("../../../src/constants/Constants");
const { enableCustomRootCAs } = require("../../../src/utils/tlsUtils");


describe("tlsUtils", () => {
  let readFileSyncStub;
  let createSecureContextStub;
  let addCACertStub;
  let origCreateSecureContext;

  beforeEach(() => {
    readFileSyncStub = sinon.stub(fs, "readFileSync");
    createSecureContextStub = sinon
      .stub(tls, "createSecureContext")
      .callsFake(() => ({
        context: {
          addCACert: (addCACertStub = sinon.stub()),
        },
      }));
    origCreateSecureContext = tls.createSecureContext;
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("enableCustomRootCAs", () => {
    it("should restore original createSecureContext after enabling custom root CAs", () => {
      Constants.EXTRA_TLS = {
        EXTRA_CERTIFICATE_CHAIN_FILE_NAME: "chain.pem",
        EXTRA_ROOT_CERT_FILE_NAME: "root.pem",
      };

      readFileSyncStub
        .withArgs("chain.pem")
        .returns(
          "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----"
        );
      readFileSyncStub
        .withArgs("root.pem")
        .returns(
          "-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----"
        );

      enableCustomRootCAs();
      tls.createSecureContext = origCreateSecureContext;

      expect(tls.createSecureContext).toEqual(origCreateSecureContext);
    });

    it("should log appropriate messages when custom root CAs are already enabled", () => {
      const consoleLogStub = sinon.stub(console, "log");
      Constants.EXTRA_TLS = {
        EXTRA_CERTIFICATE_CHAIN_FILE_NAME: "chain.pem",
        EXTRA_ROOT_CERT_FILE_NAME: "root.pem",
      };

      readFileSyncStub
        .withArgs("chain.pem")
        .returns(
          "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----"
        );
      readFileSyncStub
        .withArgs("root.pem")
        .returns(
          "-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----"
        );

      enableCustomRootCAs();
      enableCustomRootCAs(); // Call it again

      expect(consoleLogStub.calledWith("Custom root CAs was already enabled")).toBe(true);

      consoleLogStub.restore();
    });
  });
});
