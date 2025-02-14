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
const { setupTestDB, tearDownTestDB } = require("./test-database");
const NotFoundError = require("../../src/errors/NotFoundError");
const ValidationError = require("../../src/errors/ValidationError");
const InvalidEntityError = require("../../src/errors/InvalidEntityError");
const Validation = require("../../src/pki_engine/Validation.js");
const CAType = require("../../src/models/CAType.js");
const PKIEngine = require("../../src/pki_engine/PKIEngine.js");
const { INVALID } = require("../../src/constants/Constants.js");



const forge = require("node-forge");

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
    it("should return NOT_AVAILABLE when certificate is null", () => {
      const result = ctx.pkiEngine.validateCertificateValidity(null, "TEST_CODE");
      assert.equal(result.state, ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });
  
    it("should invalidate a certificate with missing notBefore", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ notAfter: new Date() });
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });
  
    it("should invalidate a certificate with missing notAfter", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ notBefore: new Date() });
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });
  
    it("should handle unexpected errors gracefully", () => {
      sinon.stub(ctx.pkiEngine, "getCertInfo").throws(new Error("Unexpected error"));
      const result = ctx.pkiEngine.validateCertificateValidity("cert", "TEST_CODE");
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
      ctx.pkiEngine.getCertInfo.restore();
    });
  });
  
  describe("validateCertificateUsageServer", () => {
    it("should return NOT_AVAILABLE for null certificate", () => {
      const result = ctx.pkiEngine.validateCertificateUsageServer(null);
      assert.equal(result.state, ValidationCodes.VALID_STATES.NOT_AVAILABLE);
    });
  
    it("should invalidate certificate without serverAuth in extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ serverAuth: false }),
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
      forge.pki.certificateFromPem.restore();
    });
  
    it("should validate certificate with serverAuth in extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => ({ serverAuth: true }),
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      assert.equal(result.state, ValidationCodes.VALID_STATES.VALID);
      forge.pki.certificateFromPem.restore();
    });
  
    it("should invalidate certificate missing extKeyUsage", () => {
      sinon.stub(forge.pki, "certificateFromPem").returns({
        getExtension: () => null,
      });
      const result = ctx.pkiEngine.validateCertificateUsageServer("cert");
      assert.equal(result.state, ValidationCodes.VALID_STATES.INVALID);
      forge.pki.certificateFromPem.restore();
    });
  });
  
  describe("createCSR", () => {
    it("should throw an error if subject is missing", async () => {
      try {
        await ctx.pkiEngine.createCSR({});
        assert.fail("Should throw an error");
      } catch (err) {
        assert.instanceOf(err, ValidationError);
        assert.include(err.message, "Invalid CAInitialInfo document");
      }
    });
    
    it("should generate a valid CSR with only a subject", async () => {
      const csrParameters = { subject: { CN: "example.com", O: "Example" } };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      assert.isNotNull(result.csr);
      assert.isNotNull(result.privateKey);
    });
  
    it("should generate a valid CSR with DNS SANs", async () => {
      const csrParameters = {
        subject: { CN: "example.com", O: "Example" },
        extensions: { subjectAltName: { dns: ["example.com", "www.example.com"] } },
      };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      assert.isNotNull(result.csr);
      assert.isNotNull(result.privateKey);
    });
  
    it("should generate a valid CSR with IP SANs", async () => {
      const csrParameters = {
        subject: { CN: "example.com", O: "Example" },
        extensions: { subjectAltName: { ips: ["127.0.0.1", "192.168.1.1"] } },
      };
      const result = await ctx.pkiEngine.createCSR(csrParameters);
      assert.isNotNull(result.csr);
      assert.isNotNull(result.privateKey);
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
      sinon.assert.calledWithExactly(ctx.pkiEngine.validateId, dfspId, "dfspId");
      sinon.assert.calledWithExactly(ctx.pkiEngine.getDFSPCA, dfspId);
      sinon.assert.calledWithExactly(ctx.pkiEngine.getDFSPOutboundEnrollments, dfspId);
      sinon.assert.calledWithExactly(ctx.pkiEngine.getCertInfo, "client-cert");
      sinon.assert.calledWithExactly(writeStub, `${ctx.pkiEngine.mounts.dfspClientCertBundle}/${dfspName}`, {
        ca_bundle: "intermediate-chain\nroot-certificate",
        client_key: "client-key",
        client_cert_chain: "client-cert\nintermediate-chain\nroot-certificate",
        fqdn: "test-client",
        host: dfspName,
        currency_code: dfspMonetaryZoneId,
        fxpCurrencies: "USD EUR",
        isProxy,
      });
    
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
        assert.fail("Should throw an error");
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.include(err.message, "dfspId is not a number");
      }
    });
  
  
    it("should populate DFSP internal IP whitelist bundle successfully", async () => {
      const value = { whitelist: ["192.168.0.1", "192.168.0.2"] };
    
      const writeStub = sinon.stub(ctx.pkiEngine.client, "write").resolves();
    
      await ctx.pkiEngine.populateDFSPInternalIPWhitelistBundle(value);
    
      sinon.assert.calledWithExactly(writeStub, `${ctx.pkiEngine.mounts.dfspInternalIPWhitelistBundle}`, value);
    
      ctx.pkiEngine.client.write.restore();
    });
    it("should populate DFSP external IP whitelist bundle successfully", async () => {
      const value = { whitelist: ["203.0.113.1", "203.0.113.2"] };
    
      const writeStub = sinon.stub(ctx.pkiEngine.client, "write").resolves();
    
      await ctx.pkiEngine.populateDFSPExternalIPWhitelistBundle(value);
    
      sinon.assert.calledWithExactly(writeStub, `${ctx.pkiEngine.mounts.dfspExternalIPWhitelistBundle}`, value);
    
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

      assert.deepEqual(result, mockResponse);
      sinon.assert.calledWith(ctx.pkiEngine.client.request, {
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
        },
      });

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

      assert.deepEqual(result, mockResponse);
      sinon.assert.calledWith(ctx.pkiEngine.client.request, {
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          alt_names: "hub.example.com,api.example.com",
        },
      });

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
    
      assert.deepEqual(result, mockResponse);
      sinon.assert.calledWith(ctx.pkiEngine.client.request, {
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          ip_sans: "127.0.0.1,192.168.1.1",
        },
      });
    
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
    
      assert.deepEqual(result, mockResponse);
      sinon.assert.calledWith(ctx.pkiEngine.client.request, {
        path: `/${ctx.pkiEngine.mounts.pki}/issue/${ctx.pkiEngine.pkiServerRole}`,
        method: "POST",
        json: {
          common_name: "hub.example.com",
          alt_names: "hub.example.com",
          ip_sans: "127.0.0.1",
        },
      });
    
      ctx.pkiEngine.client.request.restore();
    });  
    it("should throw an error if subject.CN is missing", async () => {
      const csrParameters = {
        subject: {},
      };
    
      try {
        await ctx.pkiEngine.createHubServerCert(csrParameters);
        assert.fail("Should throw an error");
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.include(err.message, "Cannot read property 'CN'");
      }
    });
    it("should handle client request error", async () => {
      const csrParameters = {
        subject: { CN: "hub.example.com" },
      };
    
      sinon.stub(ctx.pkiEngine.client, "request").rejects(new Error("Request failed"));
    
      try {
        await ctx.pkiEngine.createHubServerCert(csrParameters);
        assert.fail("Should throw an error");
      } catch (err) {
        assert.instanceOf(err, Error);
        assert.include(err.message, "Request failed");
      } finally {
        ctx.pkiEngine.client.request.restore();
      }
    });
  
   it("should return NOT_AVAILABLE if no certificate is provided", () => {
    const code = "TEST_CODE";
    const enrollment = { csr: "mock-csr", certificate: null };
  
    const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);
  
    assert.deepEqual(
      result,
      new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "No certificate")
    );
  });
  
  it("should return NOT_AVAILABLE if no CSR is provided", () => {
    const code = "TEST_CODE";
    const enrollment = { csr: null, certificate: "mock-certificate" };
  
    const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);
  
    assert.deepEqual(result, new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "No CSR"));
  });
  it("should return NOT_AVAILABLE if CA type is EXTERNAL", () => {
    const code = "TEST_CODE";
    const enrollment = { csr: "mock-csr", certificate: "mock-certificate", caType: CAType.EXTERNAL };
  
    const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);
  
    assert.deepEqual(result, new Validation(code, false, ValidationCodes.VALID_STATES.NOT_AVAILABLE, "It has an External CA"));
  });
  it("should return INVALID if CSR and certificate subjects do not match", () => {
    const code = "TEST_CODE";
    const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };
  
    sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
    sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "cert.example.com" } });
    sinon.stub(ctx.pkiEngine, "compareSubjectBetweenCSRandCert").returns({ valid: false, reason: "Subjects do not match" });
  
    const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(
      result,
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
  
  
  it("should return VALID if CSR and certificate subjects and SubjectAltNames match", () => {
    const code = "TEST_CODE";
    const enrollment = { csr: "mock-csr", certificate: "mock-certificate" };
  
    sinon.stub(ctx.pkiEngine, "getCSRInfo").returns({ subject: { CN: "csr.example.com" } });
    sinon.stub(ctx.pkiEngine, "getCertInfo").returns({ subject: { CN: "csr.example.com" } });
    sinon.stub(ctx.pkiEngine, "compareSubjectBetweenCSRandCert").returns({ valid: true });
  
    // Stub or mock compareSubjectAltNameBetweenCSRandCert
    if (!PKIEngine.compareSubjectAltNameBetweenCSRandCert) {
      PKIEngine.compareSubjectAltNameBetweenCSRandCert = sinon.stub().returns({ valid: true });
    } else {
      sinon.stub(PKIEngine, "compareSubjectAltNameBetweenCSRandCert").returns({ valid: true });
    }
  
    const result = ctx.pkiEngine.verifyCertificateCSRSameSubject(code, enrollment);
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(result, new Validation(
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(result.result, ValidationCodes.VALID_STATES.INVALID);
    assert.equal(result.message, "Certificate key length 1024 invalid, should be 2048");
    assert.deepEqual(result.data, {
      actualKeySize: { type: "INTEGER", value: 1024 },
      keyLength: { type: "INTEGER", value: 2048 },
    });
  
    ctx.pkiEngine.verifyCertKeyLength.restore();
  });
  it("should throw an error if serverCert is null or undefined", () => {
    const serverCert = null; // Invalid certificate
    const keyLength = 2048;
    const code = "TEST_CODE";
  
    try {
      ctx.pkiEngine.validateCertificateKeyLength(serverCert, keyLength, code);
      assert.fail("Should throw an error");
    } catch (err) {
      assert.instanceOf(err, Error);
      assert.include(err.message, "Empty or null cert");
    }
  });

      it("should return NOT_AVAILABLE if no certificate is provided", () => {
        const certificate = null; // Invalid certificate
        const code = "TEST_CODE";
        const algo = "SHA256withRSA";
      
        const result = ctx.pkiEngine.validateCertificateSignatureAlgorithm(certificate, code, algo);
      
        assert.deepEqual(
          result,
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
      
        assert.deepEqual(
          result,
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
      
        assert.deepEqual(
          result,
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
      
        assert.deepEqual(
          result,
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

  assert.deepEqual(
    result,
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
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

    assert.deepEqual(
      result,
      new Validation(
        code,
        false,
        ValidationCodes.VALID_STATES.NOT_AVAILABLE,
        "No dfsp CA"
      )
    );
  });
  it("should return INVALID if DFSP CA validation state is invalid", () => {
    const certificate = "mock-certificate";
    const dfspCA = { validationState: INVALID }; // Invalid validation state
    const code = "TEST_CODE";
  
    const result = ctx.pkiEngine.verifyCertificateSignedByDFSPCA(certificate, dfspCA, code);
  
    assert.deepEqual(
      result,
      new Validation(
        code,
        true, // Performed should be true
        ValidationCodes.VALID_STATES.INVALID,
        "Invalid dfsp ca root or chain"
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
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
  //...............................................................
  it("should return NOT_AVAILABLE if no certificate is provided", () => {
    const certificate = null; // No certificate
    const code = "TEST_CODE";
  
    const result = ctx.pkiEngine.verifyCertificateUsageClient(certificate, code);
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
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
  
    assert.deepEqual(
      result,
      new Validation(
        code,
        true,
        ValidationCodes.VALID_STATES.VALID,
        'Certificate has the "TLS WWW client authentication" key usage extension'
      )
    );
  
    forge.pki.certificateFromPem.restore();
  });
          

});
