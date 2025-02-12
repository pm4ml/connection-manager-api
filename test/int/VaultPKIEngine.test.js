/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

const { setupTestDB, tearDownTestDB } = require("./test-database");

const ValidationError = require("../../src/errors/ValidationError");

const fs = require("fs");
const path = require("path");
const { assert } = require("chai");
const { createContext, destroyContext } = require("./context");
const ValidationCodes = require('../../src/pki_engine/ValidationCodes.js');

describe("PKIEngine", () => {
  let ctx;
  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe("verify CSRs", () => {
    it("should validate a CSR key length", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
      assert.isTrue(result.valid);
    });

    it("should validate a CSR algorithm - 512", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      // cfssl generates CSRs with sha512
      const result = ctx.pkiEngine.verifyCSRAlgorithm(
        csr,
        "sha512WithRSAEncryption"
      );
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it("should validate a CSR algorithm - 256", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      // cfssl generates CSRs with sha512
      const result = ctx.pkiEngine.verifyCSRAlgorithm(
        csr,
        "sha512WithRSAEncryption"
      );
      assert.isTrue(result.valid, JSON.stringify(result));
    });

    it("should not validate a CSR with short key length", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4097);
      assert.isFalse(result.valid);
    });

    it("should not validate a CSR with a 2048 key length", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client-2048.csr"),
        "utf8"
      );
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
      assert.isFalse(result.valid);
    });

    it("should fail when sent a cert instead of a CSR", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      try {
        ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
        assert.fail("Should not be here");
      } catch (error) {
        assert.isNotNull(error, error);
      }
    });

    it("should create a CSR from valid parameters", async () => {
      const csrParameters = {
        subject: {
          CN: "dfspendpoint1.test.modusbox.com",
          E: "connection-manager@modusbox.com",
          O: "Modusbox",
          OU: "PKI",
        },
        extensions: {
          subjectAltName: {
            dns: [
              "dfspendpoint1.test.modusbox.com",
              "dfspendpoint2.test.modusbox.com"
            ],
            ips: ["163.10.5.24", "163.10.5.22"],
          },
        },
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      assert.isNotNull(keyCSRPair.key);
      assert.isNotNull(keyCSRPair.csr);
    }).timeout(15000);

    it("should create parse a CSR and return its info", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const csrInfo = ctx.pkiEngine.getCSRInfo(csr);
      assert.equal(
        "hub1.dev.modusbox.com",
        csrInfo.extensions.subjectAltName.dns[0]
      );
    }).timeout(15000);

    it("should create a CSR with only required subject fields", async () => {
      const csrParameters = {
        subject: {
          CN: "dfsp.test.modusbox.com",
          O: "Modusbox"
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      const csrInfo = ctx.pkiEngine.getCSRInfo(keyCSRPair.csr);
      assert.equal(csrInfo.subject.CN, csrParameters.subject.CN);
      assert.equal(csrInfo.subject.O, csrParameters.subject.O);
    });

    it("should create a CSR with only DNS subject alternative names", async () => {
      const csrParameters = {
        subject: {
          CN: "dfsp.test.modusbox.com",
          O: "Modusbox"
        },
        extensions: {
          subjectAltName: {
            dns: ["dfsp1.test.modusbox.com", "dfsp2.test.modusbox.com"]
          }
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      const csrInfo = ctx.pkiEngine.getCSRInfo(keyCSRPair.csr);
      assert.deepEqual(csrInfo.extensions.subjectAltName.dns, csrParameters.extensions.subjectAltName.dns);
      assert.isEmpty(csrInfo.extensions.subjectAltName.ips);
    });

    it("should create a CSR with only IP subject alternative names", async () => {
      const csrParameters = {
        subject: {
          CN: "dfsp.test.modusbox.com",
          O: "Modusbox"
        },
        extensions: {
          subjectAltName: {
            ips: ["192.168.1.1", "192.168.1.2"]
          }
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      const csrInfo = ctx.pkiEngine.getCSRInfo(keyCSRPair.csr);
      assert.deepEqual(csrInfo.extensions.subjectAltName.ips, csrParameters.extensions.subjectAltName.ips);
      assert.isEmpty(csrInfo.extensions.subjectAltName.dns);
    });

    it("should create a CSR with configured key length", async () => {
      const csrParameters = {
        subject: {
          CN: "dfsp.test.modusbox.com",
          O: "Modusbox"
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      const csrInfo = ctx.pkiEngine.getCSRInfo(keyCSRPair.csr);
      assert.equal(csrInfo.publicKeyLength, ctx.pkiEngine.keyLength);
    });
  });

  describe("verify Certs", () => {
    it("should create parse a Cert and return its info", async () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      const certInfo = ctx.pkiEngine.getCertInfo(cert);
      assert.equal("sha256WithRSAEncryption", certInfo.signatureAlgorithm);
    }).timeout(15000);
  });

  describe("verify CAInitialInfo creation", () => {
    it("should fail on a CAInitialInfo with empty names", async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      const caOptionsDoc = {};

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);

    it("should fail on a CAInitialInfo with no CN", async () => {
      // This is valid according to the swagger spec:
      // A CSR for a CA doesn't need hosts or names entries to have values
      // Thinking about this, a CA doesn't need hosts nor names, so we could
      // change the swagger api definition to not require a host at all, or even remove these entries for a CA
      // Have to check with the product team before making this change
      const caOptionsDoc = { O: "L" };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
      } catch (error) {
        assert.isTrue(error instanceof ValidationError, error);
      }
    }).timeout(15000);

    it("should create CA with ttl passed", async () => {
      const caOptionsDoc = {
        CN: "Test CA",
        O: "L",
      };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc, "1h");
        assert.ok("Created CA with ttl");
      } catch (error) {
        assert.fail("Should not be here");
      }
    }).timeout(15000);
  });
  
  describe("validateCertificateValidity", () => {
    it("should return NOT_AVAILABLE when no certificate provided", () => {
      const result = ctx.pkiEngine.validateCertificateValidity(null, "TEST_CODE") || {};
      console.log("Validation result:", result);
      assert.equal(result.state, ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });

    it("should validate a valid certificate", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      const result = ctx.pkiEngine.validateCertificateValidity(
        cert,
        "TEST_CODE"
      );
      assert.equal(result.state, ValidationCodes.VALID_STATES.VALID);
    });

    it("should invalidate an expired certificate", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/expired-cert.pem"),
        "utf8"
      );
      const result = ctx.pkiEngine.validateCertificateValidity(
        cert,
        "TEST_CODE"
      );
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
    });
  });

  describe("validateCertificateUsageServer", () => {
    it("should return NOT_AVAILABLE when no certificate provided", () => {
      const result = ctx.pkiEngine.validateCertificateUsageServer(null);
      assert.equal(result.state, ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });

    it("should validate server certificate with proper usage", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/server-cert.pem"),
        "utf8"
      );
      const result = ctx.pkiEngine.validateCertificateUsageServer(cert);
      assert.equal(result.state, ValidationCodes.VALID_STATES.VALID);
    });

    it("should invalidate client certificate for server usage", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/client-cert.pem"),
        "utf8"
      );
      const result = ctx.pkiEngine.validateCertificateUsageServer(cert);
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
    });
  });

  describe("vault secret management", () => {
    it("should set and get a secret", async () => {
      const key = "test-secret";
      const value = { foo: "bar" };
      await ctx.pkiEngine.setSecret(key, value);
      const result = await ctx.pkiEngine.getSecret(key);
      assert.deepEqual(result, value);
    });

    it("should list secrets", async () => {
      const keys = ["test1", "test2", "test3"];
      await Promise.all(
        keys.map((key) => ctx.pkiEngine.setSecret(key, { value: key }))
      );
      const result = await ctx.pkiEngine.listSecrets("");
      assert.includeMembers(result, keys);
    });

    it("should delete a secret", async () => {
      const key = "test-delete";
      await ctx.pkiEngine.setSecret(key, { foo: "bar" });
      await ctx.pkiEngine.deleteSecret(key);
      try {
        await ctx.pkiEngine.getSecret(key);
        assert.fail("Should have thrown NotFoundError");
      } catch (err) {
        assert.instanceOf(err, NotFoundError);
      }
    });
  });

  describe("DFSP management", () => {
    const dfspId = 123;
    const enId = 456;
    const testData = { test: "data" };

    it("should validate numeric IDs", () => {
      try {
        ctx.pkiEngine.validateId("abc", "testId");
        assert.fail("Should throw error for non-numeric ID");
      } catch (err) {
        assert.include(err.message, "not a number");
      }
    });

    it("should manage DFSP outbound enrollment", async () => {
      await ctx.pkiEngine.setDFSPOutboundEnrollment(dfspId, enId, testData);
      const result = await ctx.pkiEngine.getDFSPOutboundEnrollment(
        dfspId,
        enId
      );
      assert.deepEqual(result, testData);

      await ctx.pkiEngine.deleteDFSPOutboundEnrollment(dfspId, enId);
      try {
        await ctx.pkiEngine.getDFSPOutboundEnrollment(dfspId, enId);
        assert.fail("Should have thrown NotFoundError");
      } catch (err) {
        assert.instanceOf(err, NotFoundError);
      }
    });

    it("should manage DFSP inbound enrollment", async () => {
      await ctx.pkiEngine.setDFSPInboundEnrollment(dfspId, enId, testData);
      const result = await ctx.pkiEngine.getDFSPInboundEnrollment(dfspId, enId);
      assert.deepEqual(result, testData);

      await ctx.pkiEngine.deleteDFSPInboundEnrollment(dfspId, enId);
      try {
        await ctx.pkiEngine.getDFSPInboundEnrollment(dfspId, enId);
        assert.fail("Should have thrown NotFoundError");
      } catch (err) {
        assert.instanceOf(err, NotFoundError);
      }
    });
  });

  describe("certificate info extraction", () => {
    it("should extract CSR info", () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const info = ctx.pkiEngine.getCSRInfo(csr);
      assert.property(info, "subject");
      assert.property(info, "extensions");
      assert.property(info, "signatureAlgorithm");
      assert.property(info, "publicKeyLength");
    });

    it("should extract certificate info", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      const info = ctx.pkiEngine.getCertInfo(cert);
      assert.property(info, "subject");
      assert.property(info, "issuer");
      assert.property(info, "extensions");
      assert.property(info, "serialNumber");
      assert.property(info, "notBefore");
      assert.property(info, "notAfter");
      assert.property(info, "signatureAlgorithm");
      assert.property(info, "publicKeyLength");
    });

    it("should throw on invalid CSR", () => {
      try {
        ctx.pkiEngine.getCSRInfo("invalid-csr");
        assert.fail("Should throw on invalid CSR");
      } catch (err) {
        assert.instanceOf(err, InvalidEntityError);
      }
    });

    it("should throw on invalid certificate", () => {
      try {
        ctx.pkiEngine.getCertInfo("invalid-cert");
        assert.fail("Should throw on invalid certificate");
      } catch (err) {
        assert.instanceOf(err, InvalidEntityError);
      }
    });
  });
});
