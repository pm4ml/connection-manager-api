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

const sinon = require('sinon');
const { setupTestDB, tearDownTestDB } = require("../int/test-database.js");
const NotFoundError = require("../../src/errors/NotFoundError.js");
const ValidationError = require("../../src/errors/ValidationError.js");
const InvalidEntityError = require("../../src/errors/InvalidEntityError.js");
const Validation = require("../../src/pki_engine/Validation.js");
const CAType = require("../../src/models/CAType.js");
const PKIEngine = require("../../src/pki_engine/PKIEngine.js");
const { INVALID } = require("../../src/constants/Constants.js");

const forge = require("node-forge");

const fs = require("fs");
const path = require("path");
const { createContext, destroyContext } = require("../int/context.js");
const ValidationCodes = require('../../src/pki_engine/ValidationCodes.js');

// TODO: replace sinon with jest mocks
describe("PKIEngine", () => {
  let ctx;
  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  afterAll(async () => {
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
      expect(result.valid).toBe(true);
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
      expect(result.valid).toBe(true);
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
      expect(result.valid).toBe(true);
    });

    it("should not validate a CSR with short key length", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4097);
      expect(result.valid).toBe(false);
    });

    it("should not validate a CSR with a 2048 key length", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client-2048.csr"),
        "utf8"
      );
      const result = ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
      expect(result.valid).toBe(false);
    });

    it("should fail when sent a cert instead of a CSR", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      try {
        ctx.pkiEngine.verifyCSRKeyLength(csr, 4096);
        throw new Error("Should not be here");
      } catch (error) {
        expect(error).not.toBeNull();
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
      expect(keyCSRPair.key).not.toBeNull();
      expect(keyCSRPair.csr).not.toBeNull();
    }, 15000);

    it("should create parse a CSR and return its info", async () => {
      const csr = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.csr"),
        "utf8"
      );
      const csrInfo = ctx.pkiEngine.getCSRInfo(csr);
      expect(csrInfo.extensions.subjectAltName.dns[0]).toBe("hub1.dev.modusbox.com");
    }, 15000);

    it("should create a CSR with only required subject fields", async () => {
      const csrParameters = {
        subject: {
          CN: "dfsp.test.modusbox.com",
          O: "Modusbox"
        }
      };
      const keyCSRPair = await ctx.pkiEngine.createCSR(csrParameters);
      const csrInfo = ctx.pkiEngine.getCSRInfo(keyCSRPair.csr);
      expect(csrInfo.subject.CN).toBe(csrParameters.subject.CN);
      expect(csrInfo.subject.O).toBe(csrParameters.subject.O);
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
      expect(csrInfo.extensions.subjectAltName.dns).toEqual(csrParameters.extensions.subjectAltName.dns);
      expect(csrInfo.extensions.subjectAltName.ips).toHaveLength(0);
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
      expect(csrInfo.extensions.subjectAltName.ips).toEqual(csrParameters.extensions.subjectAltName.ips);
      expect(csrInfo.extensions.subjectAltName.dns).toHaveLength(0);
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
      expect(csrInfo.publicKeyLength).toBe(ctx.pkiEngine.keyLength);
    });
  });

  describe("verify Certs", () => {
    it("should create parse a Cert and return its info", async () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      const certInfo = ctx.pkiEngine.getCertInfo(cert);
      expect(certInfo.signatureAlgorithm).toBe("sha256WithRSAEncryption");
    }, 15000);
  });

  describe("verify CAInitialInfo creation", () => {
    it("should fail on a CAInitialInfo with empty names", async () => {
      const caOptionsDoc = {};

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    }, 15000);

    it("should fail on a CAInitialInfo with no CN", async () => {
      const caOptionsDoc = { O: "L" };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc);
        // Should not reach here
        expect(true).toBe(false);
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    }, 15000);

    it("should create CA with ttl passed", async () => {
      const caOptionsDoc = {
        CN: "Test CA",
        O: "L",
      };

      try {
        await ctx.pkiEngine.createCA(caOptionsDoc, "1h");
        expect(true).toBe(true); // Created CA with ttl
      } catch (error) {
        expect(true).toBe(false); // Should not be here
      }
    }, 15000);
  });

  describe("validateCertificateValidity", () => {
    it("should return NOT_AVAILABLE when certificate is null", () => {
      const result = ctx.pkiEngine.validateCertificateValidity(null, "TEST_CODE");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });

    it("should invalidate a certificate with missing notBefore", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ notAfter: new Date() });
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });

    it("should invalidate a certificate with missing notAfter", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ notBefore: new Date() });
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });

    it("should handle unexpected errors gracefully", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").throws(new Error("Unexpected error"));
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });
  });

  describe("validateCertificateUsageServer", () => {
    it("should return NOT_AVAILABLE for null certificate", () => {
      const result = ctx.pkiEngine.validateCertificateUsageServer(null);
      expect(result.state).toBe(ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });

    it("should invalidate certificate without serverAuth in extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ serverAuth: false }),
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.INVALID);
      forge.pki.certificateFromPem.restore();
    });

    it("should validate certificate with serverAuth in extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ serverAuth: true }),
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.VALID);
      forge.pki.certificateFromPem.restore();
    });

    it("should invalidate certificate missing extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => null,
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      expect(result.state).toBe(ValidationCodes.VALID_STATES.INVALID);
      forge.pki.certificateFromPem.restore();
    });
  });

  describe("createCSR", () => {
    it("should generate a valid CSR with only a subject", async () => {
      const csrParameters = { subject: { CN: "example.com", O: "Example" } };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      expect(result.csr).not.toBeNull();
      expect(result.privateKey).not.toBeNull();
    });

    it("should generate a valid CSR with DNS SANs", async () => {
      const csrParameters = {
        subject: { CN: "example.com", O: "Example" },
        extensions: { subjectAltName: { dns: ["example.com", "www.example.com"] } },
      };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      expect(result.csr).not.toBeNull();
      expect(result.privateKey).not.toBeNull();
    });

    it("should generate a valid CSR with IP SANs", async () => {
      const csrParameters = {
        subject: { CN: "example.com", O: "Example" },
        extensions: { subjectAltName: { ips: ["127.0.0.1", "192.168.1.1"] } },
      };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      expect(result.csr).not.toBeNull();
      expect(result.privateKey).not.toBeNull();
    });
  });

  describe("vault secret management", () => {
    it("should set and get a secret", async () => {
      const key = "test-secret";
      const value = { foo: "bar" };
      await ctx.pkiEngine.setSecret(key, value);
      const result = await ctx.pkiEngine.getSecret(key);
      expect(result).toEqual(value);
    });

    it("should list secrets", async () => {
      const keys = ["test1", "test2", "test3"];
      await Promise.all(
        keys.map((key) => ctx.pkiEngine.setSecret(key, { value: key }))
      );
      const result = await ctx.pkiEngine.listSecrets("");
      keys.forEach(k => expect(result).toContain(k));
    });

    it("should delete a secret", async () => {
      const key = "test-delete";
      await ctx.pkiEngine.setSecret(key, { foo: "bar" });
      await ctx.pkiEngine.deleteSecret(key);
      try {
        await ctx.pkiEngine.getSecret(key);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
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
        expect(true).toBe(false);
      } catch (err) {
        expect(err.message).toContain("not a number");
      }
    });

    it("should manage DFSP outbound enrollment", async () => {
      await ctx.pkiEngine.setDFSPOutboundEnrollment(dfspId, enId, testData);
      const result = await ctx.pkiEngine.getDFSPOutboundEnrollment(
        dfspId,
        enId
      );
      expect(result).toEqual(testData);

      await ctx.pkiEngine.deleteDFSPOutboundEnrollment(dfspId, enId);
      try {
        await ctx.pkiEngine.getDFSPOutboundEnrollment(dfspId, enId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
      }
    });

    it("should manage DFSP inbound enrollment", async () => {
      await ctx.pkiEngine.setDFSPInboundEnrollment(dfspId, enId, testData);
      const result = await ctx.pkiEngine.getDFSPInboundEnrollment(dfspId, enId);
      expect(result).toEqual(testData);

      await ctx.pkiEngine.deleteDFSPInboundEnrollment(dfspId, enId);
      try {
        await ctx.pkiEngine.getDFSPInboundEnrollment(dfspId, enId);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundError);
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
      expect(info).toHaveProperty("subject");
      expect(info).toHaveProperty("extensions");
      expect(info).toHaveProperty("signatureAlgorithm");
      expect(info).toHaveProperty("publicKeyLength");
    });

    it("should extract certificate info", () => {
      const cert = fs.readFileSync(
        path.join(__dirname, "resources/modusbox/hub-tls-client.pem"),
        "utf8"
      );
      const info = ctx.pkiEngine.getCertInfo(cert);
      expect(info).toHaveProperty("subject");
      expect(info).toHaveProperty("issuer");
      expect(info).toHaveProperty("extensions");
      expect(info).toHaveProperty("serialNumber");
      expect(info).toHaveProperty("notBefore");
      expect(info).toHaveProperty("notAfter");
      expect(info).toHaveProperty("signatureAlgorithm");
      expect(info).toHaveProperty("publicKeyLength");
    });

    it("should throw on invalid CSR", () => {
      expect(() => {
        ctx.pkiEngine.getCSRInfo("invalid-csr");
      }).toThrow(InvalidEntityError);
    });

    it("should throw on invalid certificate", () => {
      expect(() => {
        ctx.pkiEngine.getCertInfo("invalid-cert");
      }).toThrow(InvalidEntityError);
    });
  });

  describe("Misc", () => {

    afterEach(() => {
      sinon.restore();
    });

    it("should populate the DFSP client certificate bundle successfully", async () => {
      const dfspId = "test-dfsp-id";
      const dfspName = "test-dfsp-name";
      const dfspMonetaryZoneId = "USD";
      const isProxy = true;
      const fxpCurrencies = ["USD", "EUR"];

      // Mock dependencies
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);
      sinon.stub(ctx.pkiEngine, "getDFSPCA").resolves({
        intermediateChain: "intermediate-chain",
        rootCertificate: "root-certificate",
      });
      sinon.stub(ctx.pkiEngine, "getDFSPOutboundEnrollments").resolves([
        { id: 2, state: "CERT_SIGNED", certificate: "client-cert", key: "client-key" },
        { id: 1, state: "CERT_GENERATED" }
      ]);
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({
        subject: { CN: "test-client" },
      });
      const writeStub = sinon.stub(ctx.pkiEngine.client, "write").resolves();

      // Call the method
      await ctx.pkiEngine.populateDFSPClientCertBundle(
        dfspId,
        dfspName,
        dfspMonetaryZoneId,
        isProxy,
        fxpCurrencies
      );

      // Verify the behavior
      expect(ctx.pkiEngine.validateId.calledWithExactly(dfspId, "dfspId")).toBe(true);
      expect(ctx.pkiEngine.getDFSPCA.calledWithExactly(dfspId)).toBe(true);
      expect(ctx.pkiEngine.getDFSPOutboundEnrollments.calledWithExactly(dfspId)).toBe(true);
      expect(ctx.pkiEngine.getCertInfo.calledWithExactly("client-cert")).toBe(true);
      expect(writeStub.calledWithExactly(`${ctx.pkiEngine.mounts.dfspClientCertBundle}/${dfspName}`, {
        ca_bundle: "intermediate-chain\nroot-certificate",
        client_key: "client-key",
        client_cert_chain: "client-cert\nintermediate-chain\nroot-certificate",
        fqdn: "test-client",
        host: dfspName,
        currency_code: dfspMonetaryZoneId,
        fxpCurrencies: "USD EUR",
        isProxy,
      })).toBe(true);

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.getDFSPCA.restore();
      ctx.pkiEngine.getDFSPOutboundEnrollments.restore();
      ctx.pkiEngine.getCertInfo.restore();
      ctx.pkiEngine.client.write.restore();
    });

    it("should throw an error if dfspId is invalid", async () => {
      const dfspId = "invalid-id"; // Non-numeric value
      const dfspName = "test-dfsp-name";
      const dfspMonetaryZoneId = "USD";
      const isProxy = true;
      const fxpCurrencies = ["USD", "EUR"];

      try {
        await ctx.pkiEngine.populateDFSPClientCertBundle(dfspId, dfspName, dfspMonetaryZoneId, isProxy, fxpCurrencies);
        // Should throw
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("dfspId is not a number");
      }
    });

    it("should populate DFSP internal IP whitelist bundle successfully", async () => {
      const value = { whitelist: ["192.168.0.1", "192.168.0.2"] };

      const writeStub = sinon.stub(ctx.pkiEngine.client, "write").resolves();

      await ctx.pkiEngine.populateDFSPInternalIPWhitelistBundle(value);

      expect(writeStub.calledWithExactly(`${ctx.pkiEngine.mounts.dfspInternalIPWhitelistBundle}`, value)).toBe(true);

      ctx.pkiEngine.client.write.restore();
    });

    it("should populate DFSP external IP whitelist bundle successfully", async () => {
      const value = { whitelist: ["203.0.113.1", "203.0.113.2"] };

      const writeStub = sinon.stub(ctx.pkiEngine.client, "write").resolves();

      await ctx.pkiEngine.populateDFSPExternalIPWhitelistBundle(value);

      expect(writeStub.calledWithExactly(`${ctx.pkiEngine.mounts.dfspExternalIPWhitelistBundle}`, value)).toBe(true);

      ctx.pkiEngine.client.write.restore();
    });

    it("should create a hub server certificate with minimal input", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
      };

      const mockResponse = {
        certificate: "mock-certificate",
        issuing_ca: "mock-issuing-ca",
        private_key: "mock-private-key",
      };

      sinon.stub(ctx.pkiEngine.client, "request").resolves({ data: mockResponse });

      const result = await ctx.pkiEngine.createHubServerCert(csrParameters);

      expect(result).toEqual(mockResponse);
      expect(ctx.pkiEngine.client.request.calledWith({
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
        },
      })).toBe(true);

      ctx.pkiEngine.client.request.restore();
    });
    it("should create a hub server certificate with DNS SANs", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
        extensions: { subjectAltName: { dns: ["hub.example.com", "api.example.com"] } },
      };

      const mockResponse = {
        certificate: "mock-certificate",
        issuing_ca: "mock-issuing-ca",
        private_key: "mock-private-key",
      };

      sinon.stub(ctx.pkiEngine.client, "request").resolves({ data: mockResponse });

      const result = await ctx.pkiEngine.createHubServerCert(csrParameters);

      expect(result).toEqual(mockResponse);
      expect(ctx.pkiEngine.client.request.calledWith({
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          alt_names: "hub.example.com,api.example.com",
        },
      })).toBe(true);

      ctx.pkiEngine.client.request.restore();
    });
    it("should create a hub server certificate with IP SANs", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
        extensions: { subjectAltName: { ips: ["127.0.0.1", "192.168.1.1"] } },
      };

      const mockResponse = {
        certificate: "mock-certificate",
        issuing_ca: "mock-issuing-ca",
        private_key: "mock-private-key",
      };

      sinon.stub(ctx.pkiEngine.client, "request").resolves({ data: mockResponse });

      const result = await ctx.pkiEngine.createHubServerCert(csrParameters);

      expect(result).toEqual(mockResponse);
      expect(ctx.pkiEngine.client.request.calledWith({
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          ip_sans: "127.0.0.1,192.168.1.1",
        },
      })).toBe(true);

      ctx.pkiEngine.client.request.restore();
    });
    it("should create a hub server certificate with DNS and IP SANs", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
        extensions: { subjectAltName: { dns: ["hub.example.com"], ips: ["127.0.0.1"] } },
      };

      const mockResponse = {
        certificate: "mock-certificate",
        issuing_ca: "mock-issuing-ca",
        private_key: "mock-private-key",
      };

      sinon.stub(ctx.pkiEngine.client, "request").resolves({ data: mockResponse });

      const result = await ctx.pkiEngine.createHubServerCert(csrParameters);

      expect(result).toEqual(mockResponse);
      expect(ctx.pkiEngine.client.request.calledWith({
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          alt_names: "hub.example.com",
          ip_sans: "127.0.0.1",
        },
      })).toBe(true);

      ctx.pkiEngine.client.request.restore();
    });

    it("should throw an error if subject.CN is missing", async () => {
      const csrParameters = {
        subject: {},
      };

      try {
        await ctx.pkiEngine.createHubServerCert(csrParameters);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("the common_name field is required");
      }
    });

    it("should handle client request error", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
      };

      sinon.stub(ctx.pkiEngine.client, "request").rejects(new Error("Request failed"));

      try {
        await ctx.pkiEngine.createHubServerCert(csrParameters);
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Request failed");
      } finally {
        ctx.pkiEngine.client.request.restore();
      }
    });

    it("should return NOT_AVAILABLE if no certificate is provided", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: null };

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(
        new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "No certificate")
      );
    });

    it("should return NOT_AVAILABLE if no CSR is provided", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: null, certificate: "mock-certificate" };

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "No CSR"));
    });
    it("should return NOT_AVAILABLE if CA type is EXTERNAL", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate", caType: CAType.EXTERNAL };

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "It has an External CA"));
    });
    it("should return INVALID if CSR and certificate subjects do not match", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "cert.example.com" } });
      sinon.stub(ctx.pkiEngine, "compareSubjectBetweenCSRandCert").returns({ valid: false, reason: "Subjects do not match" });

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        "The CSR and the Certificate must have the same Subject Information",
        "Subjects do not match"
      ));

      ctx.pkiEngine.getCSRInfo.restore();
      ctx.pkiEngine.getCertInfo.restore();
      ctx.pkiEngine.compareSubjectBetweenCSRandCert.restore();
    });
    it("should return INVALID if CSR and certificate SubjectAltNames do not match", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "compareSubjectBetweenCSRandCert").returns({ valid: true });

      // Correct reference or mock for the AltName comparison
      if (!PKIEngine.compareSubjectAltNameBetweenCSRandCert) {
        PKIEngine.compareSubjectAltNameBetweenCSRandCert = sinon.stub().returns({
          valid: false,
          reason: "AltNames do not match",
        });
      } else {
        sinon.stub(PKIEngine, "compareSubjectAltNameBetweenCSRandCert").returns({
          valid: false,
          reason: "AltNames do not match",
        });
      }

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "The CSR and the Certificate must have the same Subject Extension Information",
          "AltNames do not match"
        )
      );

      // Restore stubs
      ctx.pkiEngine.getCSRInfo.restore();
      ctx.pkiEngine.getCertInfo.restore();
      ctx.pkiEngine.compareSubjectBetweenCSRandCert.restore();
      if (PKIEngine.compareSubjectAltNameBetweenCSRandCert.restore) {
        PKIEngine.compareSubjectAltNameBetweenCSRandCert.restore();
      }
    });

    it.skip("should return VALID if CSR and certificate subjects and SubjectAltNames match", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "compareSubjectBetweenCSRandCert").returns({ valid: true });

      // Stub or mock compareSubjectAltNameBetweenCSRandCert
      if (!PKIEngine.compareSubjectAltNameBetweenCSRandCert) {
        PKIEngine.compareSubjectAltNameBetweenCSRandCert = sinon.stub().returns({ valid: true });
      } else {
        sinon.stub(ctx.pkiEngine, "compareSubjectAltNameBetweenCSRandCert").returns({ valid: true });
      }

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          "The CSR and the Certificate must have the same Subject Information"
        )
      );

      // Restore stubs
      ctx.pkiEngine.getCSRInfo.restore();
      ctx.pkiEngine.getCertInfo.restore();
      ctx.pkiEngine.compareSubjectBetweenCSRandCert.restore();
      if (PKIEngine.compareSubjectAltNameBetweenCSRandCert.restore) {
        PKIEngine.compareSubjectAltNameBetweenCSRandCert.restore();
      }
    });

    it("should return NOT_AVAILABLE if no certificate is provided", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: null };

      const result = ctx.pkiEngine.verifyCertificateCSRSameCN(code, enrollment);

      expect(result).toEqual(new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        "No certificate"
      ));
    });
    it("should return NOT_AVAILABLE if no CSR is provided", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: null, certificate: "mock-certificate" };

      const result = ctx.pkiEngine.verifyCertificateCSRSameCN(code, enrollment);

      expect(result).toEqual(new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        "No CSR"
      ));
    });
    it("should return NOT_AVAILABLE if CA type is INTERNAL", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate", caType: CAType.INTERNAL };

      const result = ctx.pkiEngine.verifyCertificateCSRSameCN(code, enrollment);

      expect(result).toEqual(new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        "It has an Internal CA"
      ));
    });
    it("should return INVALID if CSR and certificate CNs do not match", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "cert.example.com" } });
      sinon.stub(ctx.pkiEngine, "compareCNBetweenCSRandCert").returns({ valid: false, reason: "CNs do not match" });

      const result = ctx.pkiEngine.verifyCertificateCSRSameCN(code, enrollment);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        "The CSR and the Certificate must have the same CN",
        "CNs do not match"
      ));

      // Restore stubs
      ctx.pkiEngine.getCSRInfo.restore();
      ctx.pkiEngine.getCertInfo.restore();
      ctx.pkiEngine.compareCNBetweenCSRandCert.restore();
    });
    it("should return INVALID if the CSR cannot be parsed", () => {
      const csr = "invalid-csr";
      const code = "TEST_CODE";

      sinon.stub(ctx.pkiEngine, "getCSRInfo").throws(new Error("Invalid CSR format"));

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        "CSR couldn't be parsed"
      ));

      ctx.pkiEngine.getCSRInfo.restore();
    });
    it("should return INVALID if CSR is missing a mandatory distinguished name field", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";

      // Mock CSR info with missing 'C' (Country)
      const mockCsrInfo = {
        subject: {
          CN: "example.com",
          OU: "UnitA",
          O: "OrganizationA",
          L: "CityA",
          ST: "StateA",
          E: "email@example.com", // Missing 'C'
        },
      };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns(mockCsrInfo);

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        "CSR missing required distinguished name attributes. Missing: C"
      ));

      ctx.pkiEngine.getCSRInfo.restore();
    });
    it("should return VALID if CSR has all mandatory distinguished name fields", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";

      // Mock CSR info with all mandatory fields
      const mockCsrInfo = {
        subject: {
          CN: "example.com",
          OU: "UnitA",
          O: "OrganizationA",
          L: "CityA",
          ST: "StateA",
          C: "US",
          E: "email@example.com",
        },
      };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns(mockCsrInfo);

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.VALID,
        "CSR has all mandatory distiguished name attributes"
      ));

      ctx.pkiEngine.getCSRInfo.restore();
    });
    it("should return INVALID if CSR is empty or null", () => {
      const csr = null; // Empty CSR
      const code = "TEST_CODE";

      sinon.stub(ctx.pkiEngine, "getCSRInfo").throws(new Error("CSR is empty or null"));

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.INVALID,
        "CSR couldn't be parsed"
      ));

      ctx.pkiEngine.getCSRInfo.restore();
    });

    it("should return VALID if certificate key length matches the required length", () => {
      const serverCert = "mock-server-cert";
      const keyLength = 2048;
      const code = "TEST_CODE";

      sinon.stub(ctx.pkiEngine, "verifyCertKeyLength").returns({ valid: true });

      const result = ctx.pkiEngine.validateCertificateKeyLength(serverCert, keyLength, code);

      expect(result).toEqual(
        new Validation(code, true, ValidationCodes.VALID_STATES.VALID, "Certificate key length valid")
      );

      ctx.pkiEngine.verifyCertKeyLength.restore();
    });
    it("should return INVALID if certificate key length does not match the required length", () => {
      const serverCert = "mock-server-cert";
      const keyLength = 2048;
      const code = "TEST_CODE";

      const reason = { actualKeySize: 1024 }; // Mocked reason
      sinon.stub(ctx.pkiEngine, "verifyCertKeyLength").returns({ valid: false, reason });

      const result = ctx.pkiEngine.validateCertificateKeyLength(serverCert, keyLength, code);

      expect(result.result).toEqual(ValidationCodes.VALID_STATES.INVALID);
      expect(result.message).toBe("Certificate key length 1024 invalid, should be 2048");
      expect(result.data).toEqual({
        actualKeySize: { type: "INTEGER", value: 1024 },
        keyLength: { type: "INTEGER", value: 2048 },
      });

      ctx.pkiEngine.verifyCertKeyLength.restore();
    });
    it("should throw an error if serverCert is null or undefined", () => {
      const serverCert = null; // Invalid certificate
      const keyLength = 2048;
      const code = "TEST_CODE";

      expect(() => {
        ctx.pkiEngine.validateCertificateKeyLength(serverCert, keyLength, code);
      }).toThrowError(/Empty or null cert/);
    });

    it("should return NOT_AVAILABLE if no certificate is provided", () => {
      const certificate = null; // Invalid certificate
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      const result = ctx.pkiEngine.validateCertificateSignatureAlgorithm(certificate, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          false,
          ValidationCodes.VALID_STATES.NOT_AVAILABLE,
          "No certificate"
        )
      );
    });
    it("should return VALID if certificate has the correct signature algorithm", () => {
      const certificate = "mock-certificate";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      sinon.stub(ctx.pkiEngine, "verifyCertAlgorithm").returns({ valid: true });

      const result = ctx.pkiEngine.validateCertificateSignatureAlgorithm(certificate, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          `certificate has a valid Signature Algorithm : ${algo}`
        )
      );

      ctx.pkiEngine.verifyCertAlgorithm.restore();
    });
    it("should return INVALID if certificate has an incorrect signature algorithm", () => {
      const certificate = "mock-certificate";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      const reason = { actualAlgorithm: "SHA1withRSA" }; // Mocked reason
      sinon.stub(ctx.pkiEngine, "verifyCertAlgorithm").returns({ valid: false, reason });

      const result = ctx.pkiEngine.validateCertificateSignatureAlgorithm(certificate, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          `certificate has a an invalid Signature Algorithm ${reason.actualAlgorithm}`
        )
      );

      ctx.pkiEngine.verifyCertAlgorithm.restore();
    });
    it("should return INVALID if certificate cannot be parsed", () => {
      const certificate = "invalid-certificate";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      sinon.stub(ctx.pkiEngine, "verifyCertAlgorithm").throws(new Error("Invalid certificate format"));

      const result = ctx.pkiEngine.validateCertificateSignatureAlgorithm(certificate, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "certificate couldn't be parsed"
        )
      );

      ctx.pkiEngine.verifyCertAlgorithm.restore();
    });
    it("should return VALID if CSR has the correct public key length", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";
      const length = 2048;

      // Stub the `verifyCSRKeyLength` method to simulate a valid result
      sinon.stub(ctx.pkiEngine, "verifyCSRKeyLength").returns({ valid: true });

      const result = ctx.pkiEngine.validateCsrPublicKeyLength(csr, code, length);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          `CSR has a valid Public Key length of ${length}`
        )
      );

      ctx.pkiEngine.verifyCSRKeyLength.restore();
    });
    it("should return INVALID if CSR has an incorrect public key length", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";
      const length = 2048;

      // Mock an invalid result with the actual key size
      const reason = { actualKeySize: 1024 };
      sinon.stub(ctx.pkiEngine, "verifyCSRKeyLength").returns({ valid: false, reason });

      const result = ctx.pkiEngine.validateCsrPublicKeyLength(csr, code, length);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          `CSR Public Key length is not ${length}, it is ${reason.actualKeySize}`
        )
      );

      ctx.pkiEngine.verifyCSRKeyLength.restore();
    });
    it("should return INVALID if CSR cannot be parsed", () => {
      const csr = "invalid-csr";
      const code = "TEST_CODE";
      const length = 2048;

      // Simulate an error thrown by `verifyCSRKeyLength`
      sinon.stub(ctx.pkiEngine, "verifyCSRKeyLength").throws(new Error("Invalid CSR format"));

      const result = ctx.pkiEngine.validateCsrPublicKeyLength(csr, code, length);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "CSR couldn't be parsed"
        )
      );

      ctx.pkiEngine.verifyCSRKeyLength.restore();
    });

    it("should return NOT_AVAILABLE if no DFSP CA is provided", () => {
      const certificate = "mock-certificate";
      const dfspCA = null; // No DFSP CA
      const code = "TEST_CODE";

      const result = ctx.pkiEngine.verifyCertificateSignedByDFSPCA(certificate, dfspCA, code);

      expect(result).toEqual(
        new Validation(
          code,
          false,
          ValidationCodes.VALID_STATES.NOT_AVAILABLE,
          "No dfsp CA"
        )
      );
    });

    it("should return VALID if the certificate is signed by the DFSP CA", () => {
      const certificate = "mock-certificate";
      const dfspCA = {
        rootCertificate: "mock-root-cert",
        intermediateChain: "mock-intermediate-chain",
        validationState: "VALID",
      };
      const code = "TEST_CODE";

      // Stub required methods
      sinon.stub(ctx.pkiEngine, "splitCertificateChain").returns(["mock-intermediate-cert"]);
      sinon.stub(forge.pki, "createCaStore").returns({});
      sinon.stub(forge.pki, "certificateFromPem").returns("parsed-cert");
      sinon.stub(forge.pki, "verifyCertificateChain").returns(true);

      const result = ctx.pkiEngine.verifyCertificateSignedByDFSPCA(certificate, dfspCA, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          "The Certificate is signed by the DFSP CA"
        )
      );

      // Restore stubs
      ctx.pkiEngine.splitCertificateChain.restore();
      forge.pki.createCaStore.restore();
      forge.pki.certificateFromPem.restore();
      forge.pki.verifyCertificateChain.restore();
    });
    it("should return INVALID if the certificate chain verification fails", () => {
      const certificate = "mock-certificate";
      const dfspCA = {
        rootCertificate: "mock-root-cert",
        intermediateChain: "mock-intermediate-chain",
        validationState: "VALID",
      };
      const code = "TEST_CODE";

      sinon.stub(ctx.pkiEngine, "splitCertificateChain").returns(["mock-intermediate-cert"]);
      sinon.stub(forge.pki, "createCaStore").returns({});
      sinon.stub(forge.pki, "certificateFromPem").returns("parsed-cert");
      sinon.stub(forge.pki, "verifyCertificateChain").throws(new Error("Chain verification failed"));

      const result = ctx.pkiEngine.verifyCertificateSignedByDFSPCA(certificate, dfspCA, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "Chain verification failed"
        )
      );

      // Restore stubs
      ctx.pkiEngine.splitCertificateChain.restore();
      forge.pki.createCaStore.restore();
      forge.pki.certificateFromPem.restore();
      forge.pki.verifyCertificateChain.restore();
    });
    it("should return INVALID if the certificate cannot be parsed", () => {
      const certificate = "invalid-certificate";
      const dfspCA = {
        rootCertificate: "mock-root-cert",
        intermediateChain: "mock-intermediate-chain",
        validationState: "VALID",
      };
      const code = "TEST_CODE";

      sinon.stub(ctx.pkiEngine, "splitCertificateChain").returns(["mock-intermediate-cert"]);
      sinon.stub(forge.pki, "createCaStore").returns({});
      sinon.stub(forge.pki, "certificateFromPem").throws(new Error("Invalid certificate format"));

      const result = ctx.pkiEngine.verifyCertificateSignedByDFSPCA(certificate, dfspCA, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "Invalid certificate format"
        )
      );

      // Restore stubs
      ctx.pkiEngine.splitCertificateChain.restore();
      forge.pki.createCaStore.restore();
      forge.pki.certificateFromPem.restore();
    });

    it("should return NOT_AVAILABLE if no certificate is provided", () => {
      const certificate = null; // No certificate
      const code = "TEST_CODE";

      const result = ctx.pkiEngine.verifyCertificateUsageClient(certificate, code);

      expect(result).toEqual(
        new Validation(
          code,
          false,
          ValidationCodes.VALID_STATES.NOT_AVAILABLE,
          "No certificate"
        )
      );
    });
    it("should return INVALID if certificate is missing the 'extKeyUsage' extension", () => {
      const certificate = "mock-certificate";
      const code = "TEST_CODE";

      // Stub `forge.pki.certificateFromPem` to return a mock certificate without `extKeyUsage`
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => null, // No `extKeyUsage` extension
      });

      const result = ctx.pkiEngine.verifyCertificateUsageClient(certificate, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          'Certificate doesn\'t have the "TLS WWW client authentication" key usage extension'
        )
      );

      forge.pki.certificateFromPem.restore();
    });
    it("should return INVALID if certificate is missing 'clientAuth' in the 'extKeyUsage' extension", () => {
      const certificate = "mock-certificate";
      const code = "TEST_CODE";

      // Stub `forge.pki.certificateFromPem` to return a mock certificate with `extKeyUsage` but without `clientAuth`
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ clientAuth: false }), // `clientAuth` is false
      });

      const result = ctx.pkiEngine.verifyCertificateUsageClient(certificate, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          'Certificate doesn\'t have the "TLS WWW client authentication" key usage extension'
        )
      );

      forge.pki.certificateFromPem.restore();
    });
    it("should return VALID if certificate has the 'clientAuth' key usage in the 'extKeyUsage' extension", () => {
      const certificate = "mock-certificate";
      const code = "TEST_CODE";

      // Stub `forge.pki.certificateFromPem` to return a mock certificate with valid `extKeyUsage`
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ clientAuth: true }), // `clientAuth` is true
      });

      const result = ctx.pkiEngine.verifyCertificateUsageClient(certificate, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          'Certificate has the "TLS WWW client authentication" key usage extension'
        )
      );

      forge.pki.certificateFromPem.restore();
    });
    it("should return NOT_AVAILABLE if no certificate is provided", () => {
      const code = "TEST_CODE";
      const enrollment = { csr: "mock-csr", certificate: null };

      const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);

      expect(result).toEqual(
        new Validation(
          code,
          false,
          ValidationCodes.VALID_STATES.NOT_AVAILABLE,
          "No certificate"
        )
      );
    });
    it("should sign an intermediate hub CSR successfully", async () => {
      const csr = "mock-csr";
      const mockCsrInfo = {
        subject: {
          getField: sinon.stub().withArgs("CN").returns({ value: "intermediate.example.com" }),
        },
      };
      const mockResponse = { data: { certificate: "mock-signed-certificate" } };

      // Stub dependencies
      sinon.stub(forge.pki, "certificationRequestFromPem").returns(mockCsrInfo);
      sinon.stub(ctx.pkiEngine.client, "request").resolves(mockResponse);

      // Call the method
      const result = await ctx.pkiEngine.signIntermediateHubCSR(csr);

      // Assertions
      expect(result).toEqual(mockResponse.data);
      sinon.assert.calledOnceWithExactly(
        ctx.pkiEngine.client.request,
        {
          path: `/${ctx.pkiEngine.mounts.pki}/root/sign-intermediate`,
          method: "POST",
          json: {
            use_csr_values: true,
            common_name: "intermediate.example.com",
            csr,
          },
        }
      );

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
      ctx.pkiEngine.client.request.restore();
    });
    it("should throw an error if the CSR is invalid", async () => {
      const csr = "invalid-csr";

      // Stub `forge.pki.certificationRequestFromPem` to throw an error
      sinon.stub(forge.pki, "certificationRequestFromPem").throws(new Error("Invalid CSR format"));

      try {
        await ctx.pkiEngine.signIntermediateHubCSR(csr);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Invalid CSR format");
      }

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
    });
    it("should throw an error if signing the CSR fails", async () => {
      const csr = "mock-csr";
      const mockCsrInfo = {
        subject: {
          getField: sinon.stub().withArgs("CN").returns({ value: "intermediate.example.com" }),
        },
      };

      // Stub dependencies
      sinon.stub(forge.pki, "certificationRequestFromPem").returns(mockCsrInfo);
      sinon.stub(ctx.pkiEngine.client, "request").rejects(new Error("Request failed"));

      try {
        await ctx.pkiEngine.signIntermediateHubCSR(csr);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Request failed");
      }

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
      ctx.pkiEngine.client.request.restore();
    });
    it("should sign a CSR using the intermediate CA successfully", async () => {
      const csr = "mock-csr";
      const mockCsrInfo = {
        subject: {
          getField: sinon.stub().withArgs("CN").returns({ value: "example.com" }),
        },
      };
      const mockResponse = { data: { certificate: "mock-signed-certificate" } };

      // Stub dependencies
      sinon.stub(forge.pki, "certificationRequestFromPem").returns(mockCsrInfo);
      sinon.stub(ctx.pkiEngine.client, "request").resolves(mockResponse);

      // Call the method
      const result = await ctx.pkiEngine.signWithIntermediateCA(csr);

      // Assertions
      expect(result).toBe("mock-signed-certificate");
      sinon.assert.calledOnceWithExactly(
        ctx.pkiEngine.client.request,
        {
          path: `/${ctx.pkiEngine.mounts.intermediatePki}/sign/${ctx.pkiEngine.pkiClientRole}`,
          method: "POST",
          json: {
            common_name: "example.com",
            csr,
          },
        }
      );

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
      ctx.pkiEngine.client.request.restore();
    });

    it("should throw an error if the CSR is invalid", async () => {
      const csr = "invalid-csr";

      // Stub `forge.pki.certificationRequestFromPem` to throw an error
      sinon.stub(forge.pki, "certificationRequestFromPem").throws(new Error("Invalid CSR format"));

      try {
        await ctx.pkiEngine.signWithIntermediateCA(csr);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Invalid CSR format");
      }

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
    });
    it("should throw an error if signing the CSR fails", async () => {
      const csr = "mock-csr";
      const mockCsrInfo = {
        subject: {
          getField: sinon.stub().withArgs("CN").returns({ value: "example.com" }),
        },
      };

      // Stub dependencies
      sinon.stub(forge.pki, "certificationRequestFromPem").returns(mockCsrInfo);
      sinon.stub(ctx.pkiEngine.client, "request").rejects(new Error("Request failed"));

      try {
        await ctx.pkiEngine.signWithIntermediateCA(csr);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Request failed");
      }

      // Restore stubs
      forge.pki.certificationRequestFromPem.restore();
      ctx.pkiEngine.client.request.restore();
    });

    it("should return INVALID if the CSR cannot be parsed", () => {
      const csr = "invalid-csr";
      const code = "TEST_CODE";

      // Stub `getCSRInfo` to throw an error
      sinon.stub(ctx.pkiEngine, "getCSRInfo").throws(new Error("CSR parsing failed"));

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "CSR couldn't be parsed"
        )
      );

      ctx.pkiEngine.getCSRInfo.restore();
    });

    it("should return INVALID if the CSR is missing a mandatory distinguished name field", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";

      // Mock CSR info with missing 'C' (Country)
      const mockCsrInfo = {
        subject: {
          CN: "example.com",
          OU: "UnitA",
          O: "OrganizationA",
          L: "CityA",
          ST: "StateA",
          E: "email@example.com", // Missing 'C'
        },
      };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns(mockCsrInfo);

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "CSR missing required distinguished name attributes. Missing: C"
        )
      );

      ctx.pkiEngine.getCSRInfo.restore();
    });
    it("should return VALID if the CSR has all mandatory distinguished name fields", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";

      // Mock CSR info with all required fields
      const mockCsrInfo = {
        subject: {
          CN: "example.com",
          OU: "UnitA",
          O: "OrganizationA",
          L: "CityA",
          ST: "StateA",
          C: "US",
          E: "email@example.com",
        },
      };

      sinon.stub(ctx.pkiEngine, "getCSRInfo").returns(mockCsrInfo);

      const result = ctx.pkiEngine.verifyCsrMandatoryDistinguishedNames(csr, code);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          "CSR has all mandatory distiguished name attributes"
        )
      );

      ctx.pkiEngine.getCSRInfo.restore();
    });

    it("should fetch all DFSP inbound enrollments for a valid dfspId", async () => {
      const dfspId = "mock-dfsp-id";
      const mockSecrets = ["enrollment1", "enrollment2"];
      const mockEnrollments = [
        { id: "enrollment1", data: "mock-data-1" },
        { id: "enrollment2", data: "mock-data-2" }
      ];

      // Stub `validateId`
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);

      // Stub `listSecrets` to return mock secrets
      sinon.stub(ctx.pkiEngine, "listSecrets").resolves(mockSecrets);

      // Stub `getDFSPInboundEnrollment` to return mock enrollments
      sinon.stub(ctx.pkiEngine, "getDFSPInboundEnrollment")
        .withArgs(dfspId, "enrollment1").resolves(mockEnrollments[0])
        .withArgs(dfspId, "enrollment2").resolves(mockEnrollments[1]);

      // Call the method
      const result = await ctx.pkiEngine.getDFSPInboundEnrollments(dfspId);

      // Assertions
      expect(result).toEqual(mockEnrollments);

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.listSecrets.restore();
      ctx.pkiEngine.getDFSPInboundEnrollment.restore();
    });

    it("should throw an error if dfspId is invalid", async () => {
      const dfspId = null; // Invalid dfspId

      // Stub `validateId` to throw an error
      sinon.stub(ctx.pkiEngine, "validateId").throws(new Error("Invalid dfspId"));

      try {
        await ctx.pkiEngine.getDFSPInboundEnrollments(dfspId);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Invalid dfspId");
      }

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
    });

    it("should return an empty array if no secrets are found", async () => {
      const dfspId = "mock-dfsp-id";

      // Stub `validateId`
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);

      // Stub `listSecrets` to return an empty array
      sinon.stub(ctx.pkiEngine, "listSecrets").resolves([]);

      // Call the method
      const result = await ctx.pkiEngine.getDFSPInboundEnrollments(dfspId);

      // Assertions
      expect(result).toEqual([]);

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.listSecrets.restore();
    });

    it("should throw an error if fetching an individual enrollment fails", async () => {
      const dfspId = "mock-dfsp-id";
      const mockSecrets = ["enrollment1", "enrollment2"];

      // Stub `validateId`
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);

      // Stub `listSecrets` to return mock secrets
      sinon.stub(ctx.pkiEngine, "listSecrets").resolves(mockSecrets);

      // Stub `getDFSPInboundEnrollment` to throw an error for the first enrollment
      sinon.stub(ctx.pkiEngine, "getDFSPInboundEnrollment")
        .withArgs(dfspId, "enrollment1").throws(new Error("Failed to fetch enrollment"))
        .withArgs(dfspId, "enrollment2").resolves({ id: "enrollment2", data: "mock-data-2" });

      try {
        await ctx.pkiEngine.getDFSPInboundEnrollments(dfspId);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Failed to fetch enrollment");
      }

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.listSecrets.restore();
      ctx.pkiEngine.getDFSPInboundEnrollment.restore();
    });

    it("should return the DFSP CA for a valid dfspId", async () => {
      const dfspId = "mock-dfsp-id";
      const mockSecret = { key: "mock-key", value: "mock-value" };

      // Stub `validateId`
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);

      // Stub `getSecret` to return a mock secret
      sinon.stub(ctx.pkiEngine, "getSecret").resolves(mockSecret);

      // Call the method
      const result = await ctx.pkiEngine.getDFSPCA(dfspId);

      // Assertions
      expect(result).toEqual(mockSecret);
      sinon.assert.calledOnceWithExactly(ctx.pkiEngine.validateId, dfspId, "dfspId");

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.getSecret.restore();
    });

    it("should throw an error if dfspId is invalid", async () => {
      const dfspId = null; // Invalid dfspId

      // Stub `validateId` to throw an error
      sinon.stub(ctx.pkiEngine, "validateId").throws(new Error("Invalid dfspId"));

      try {
        await ctx.pkiEngine.getDFSPCA(dfspId);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Invalid dfspId");
      }

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
    });

    it("should throw an error if retrieving the secret fails", async () => {
      const dfspId = "mock-dfsp-id";

      // Stub `validateId`
      sinon.stub(ctx.pkiEngine, "validateId").returns(true);

      // Stub `getSecret` to throw an error
      sinon.stub(ctx.pkiEngine, "getSecret").throws(new Error("Secret retrieval failed"));

      try {
        await ctx.pkiEngine.getDFSPCA(dfspId);
        // Should have thrown
        expect(true).toBe(false);
      } catch (err) {
        expect(err).toBeInstanceOf(Error);
        expect(err.message).toContain("Secret retrieval failed");
      }

      // Restore stubs
      ctx.pkiEngine.validateId.restore();
      ctx.pkiEngine.getSecret.restore();
    });

    it("should return VALID if CSR has the correct signature algorithm", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      // Mock `verifyCSRAlgorithm` to return valid result
      sinon.stub(ctx.pkiEngine, "verifyCSRAlgorithm").returns({
        valid: true,
        reason: { actualAlgorithm: "SHA256withRSA" },
      });

      const result = ctx.pkiEngine.validateCsrSignatureAlgorithm(csr, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.VALID,
          "CSR has a valid Signature Algorithm : SHA256withRSA"
        )
      );

      // Restore stubs
      ctx.pkiEngine.verifyCSRAlgorithm.restore();
    });

    it("should return INVALID if CSR has an incorrect signature algorithm", () => {
      const csr = "mock-csr";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      // Mock `verifyCSRAlgorithm` to return invalid result
      sinon.stub(ctx.pkiEngine, "verifyCSRAlgorithm").returns({
        valid: false,
        reason: { actualAlgorithm: "SHA1withRSA" },
      });

      const result = ctx.pkiEngine.validateCsrSignatureAlgorithm(csr, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "CSR has a an invalid Signature Algorithm SHA1withRSA"
        )
      );

      // Restore stubs
      ctx.pkiEngine.verifyCSRAlgorithm.restore();
    });

    it("should return INVALID if CSR cannot be parsed", () => {
      const csr = "invalid-csr";
      const code = "TEST_CODE";
      const algo = "SHA256withRSA";

      // Mock `verifyCSRAlgorithm` to throw an error
      sinon.stub(ctx.pkiEngine, "verifyCSRAlgorithm").throws(new Error("CSR parsing failed"));

      const result = ctx.pkiEngine.validateCsrSignatureAlgorithm(csr, code, algo);

      expect(result).toEqual(
        new Validation(
          code,
          true,
          ValidationCodes.VALID_STATES.INVALID,
          "CSR couldn't be parsed"
        )
      );

      // Restore stubs
      ctx.pkiEngine.verifyCSRAlgorithm.restore();
    });
  });
});
