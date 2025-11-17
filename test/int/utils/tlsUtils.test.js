const tls = require("tls");
const fs = require("fs");
const Constants = require("../../../src/constants/Constants");
const { enableCustomRootCAs } = require("../../../src/utils/tlsUtils");
const logger = require("../../../src/log/logger").logger;

describe("tlsUtils", () => {
  let readFileSyncMock;
  let createSecureContextMock;
  let addCACertMock;
  let origCreateSecureContext;
  let loggerInfoMock;

  beforeEach(() => {
    readFileSyncMock = jest.spyOn(fs, "readFileSync");
    addCACertMock = jest.fn();
    createSecureContextMock = jest
      .spyOn(tls, "createSecureContext")
      .mockImplementation(() => ({
        context: {
          addCACert: addCACertMock,
        },
      }));
    origCreateSecureContext = tls.createSecureContext;
    loggerInfoMock = jest.spyOn(logger, "info").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("enableCustomRootCAs", () => {
    it("should restore original createSecureContext after enabling custom root CAs", () => {
      Constants.EXTRA_TLS = {
        EXTRA_CERTIFICATE_CHAIN_FILE_NAME: "chain.pem",
        EXTRA_ROOT_CERT_FILE_NAME: "root.pem",
      };

      readFileSyncMock.mockImplementation((file) => {
        if (file === "chain.pem") {
          return "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----";
        }
        if (file === "root.pem") {
          return "-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----";
        }
        return "";
      });

      enableCustomRootCAs();
      tls.createSecureContext = origCreateSecureContext;

      expect(tls.createSecureContext).toBe(origCreateSecureContext);
    });

    it("should log appropriate messages when custom root CAs are already enabled", () => {
      Constants.EXTRA_TLS = {
        EXTRA_CERTIFICATE_CHAIN_FILE_NAME: "chain.pem",
        EXTRA_ROOT_CERT_FILE_NAME: "root.pem",
      };

      readFileSyncMock.mockImplementation((file) => {
        if (file === "chain.pem") {
          return "-----BEGIN CERTIFICATE-----\nchain\n-----END CERTIFICATE-----";
        }
        if (file === "root.pem") {
          return "-----BEGIN CERTIFICATE-----\nroot\n-----END CERTIFICATE-----";
        }
      });

      enableCustomRootCAs();
      enableCustomRootCAs(); // Call it again

      expect(loggerInfoMock).toHaveBeenCalledWith("Custom root CAs was already enabled");
    });
  });
});
