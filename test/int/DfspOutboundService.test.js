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

const fs = require("fs");
const path = require("path");
const PkiService = require("../../src/service/PkiService");
const DfspOutboundService = require("../../src/service/DfspOutboundService");
const { assert } = require("chai");
const { expect } = require("chai");
const ROOT_CA = require("./Root_CA.js");
const DFSPModel = require("../../src/models/DFSPModel");
const forge = require("node-forge");
const sinon = require("sinon");
const ValidationCodes = require("../../src/pki_engine/ValidationCodes");
const { createInternalHubCA } = require("../../src/service/HubCAService");
const { createContext, destroyContext } = require("./context");

// Sign CSR and return certificate ( what the DFSP would do )
const createCertFromCSR = (csrPem) => {
  const certPath = path.join(__dirname, "resources/modusbox/ca.pem");
  const keyPath = path.join(__dirname, "resources/modusbox/ca-key.pem");

  const caCert = forge.pki.certificateFromPem(fs.readFileSync(certPath));
  const privateKey = forge.pki.privateKeyFromPem(fs.readFileSync(keyPath));
  const csr = forge.pki.certificationRequestFromPem(csrPem);

  const cert = forge.pki.createCertificate();
  cert.serialNumber = "02";

  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  // subject from CSR
  if (csr.subject?.attributes) {
    cert.setSubject(csr.subject.attributes);
    // issuer from CA
    cert.setIssuer(caCert.subject.attributes);
    const ext = csr.getAttribute({ name: "extensionRequest" })?.extensions;
    if (ext) {
      cert.setExtensions(ext);
    }
  }

  cert.publicKey = csr.publicKey;
  cert.sign(privateKey, forge.md.sha256.create());

  return forge.pki.certificateToPem(cert);
};

describe("DfspOutboundService", function () {
  let ctx;
  before(async () => {
    await setupTestDB();
    ctx = await createContext();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe("DfspOutboundService flow", function () {
    let dfspId = null;
    const DFSP_TEST_OUTBOUND = "dfsp.outbound.io";
    beforeEach("creating DFSP", async function () {

      await createInternalHubCA(ctx, ROOT_CA);

      const dfsp = {
        dfspId: DFSP_TEST_OUTBOUND,
        name: "DFSP used to test outbound flow",
      };
      const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
      dfspId = resultDfsp.id;

      const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
      try {
        await ctx.pkiEngine.deleteAllDFSPData(dbDfspId);
      } catch (e) {}
    }, 10000);

    afterEach("tearing down ENV and DFSP", async () => {
      await PkiService.deleteDFSP(ctx, dfspId);
    });

    it("should get DFSP outbound enrollments", async () => {
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        dfspId
      );
      assert.isArray(enrollments);
    });

    it("should get DFSP outbound enrollments filtered by state", async () => {
      const state = "CSR_LOADED";
      const enrollments = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        dfspId,
        state
      );
      assert.isArray(enrollments);
      enrollments.forEach((enrollment) => {
        assert.equal(enrollment.state, state);
      });
    });
    it("should create an OutboundEnrollment and its CSR and get a VALIDATED when validating the signed certificate", async () => {
      const body = {
        subject: {
          CN: "dfspendpoint1.test.modusbox.com",
          E: "connection-manager@modusbox.com",
          O: "Modusbox",
          OU: "PKI",
          ST: "XX",
          C: "YY",
          L: "ZZ",
        },
        extensions: {
          subjectAltName: {
            dns: [
              "dfspendpoint1.test.modusbox.com",
              "dfspendpoint2.test.modusbox.com"
            ],
            ips: ["163.10.5.1", "163.10.5.2"],
          },
        },
      };
      const enrollmentResult =
        await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          dfspId,
          body
        );
      assert.property(enrollmentResult, "id");
      assert.isNotNull(enrollmentResult.id);
      const enrollmentId = enrollmentResult.id;

      const newEnrollment = await DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        dfspId,
        enrollmentId
      );
      assert.equal(newEnrollment.id, enrollmentId);
      assert.equal(newEnrollment.state, "CSR_LOADED");
      assert.notProperty(newEnrollment, "key");

      const newCert = createCertFromCSR(newEnrollment.csr);

      // Now push the certificate to the Connection-Manager
      const certAddedEnrollment =
        await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId,
          { certificate: newCert }
        );
      // Validate its state
      assert.equal(certAddedEnrollment.id, enrollmentId);
      assert.equal(certAddedEnrollment.certificate, newCert);
      assert.equal(certAddedEnrollment.state, "CERT_SIGNED");

      // Validate its state again
      const afterCertAddedEnrollment =
        await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          dfspId,
          enrollmentId
        );
      assert.equal(afterCertAddedEnrollment.id, enrollmentId);
      assert.equal(afterCertAddedEnrollment.certificate, newCert);
      assert.equal(afterCertAddedEnrollment.state, "CERT_SIGNED");

      // Now ask the TSP to validate the cert
      const afterCertValidatedEnrollment =
        await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId
        );

      // Since I didn't upload the dfsp ca, it can't validate the cert
      assert.equal(afterCertValidatedEnrollment.validationState, "VALID");
      const validationSignedByDFSPCA =
        afterCertValidatedEnrollment.validations.find(
          (element) =>
            element.validationCode ===
            ValidationCodes.VALIDATION_CODES.CERTIFICATE_SIGNED_BY_DFSP_CA.code
        );
      assert.equal(validationSignedByDFSPCA.result, "NOT_AVAILABLE");

      // let's upload it
      await PkiService.setDFSPca(ctx, dfspId, {
        rootCertificate: fs
          .readFileSync(path.join(__dirname, "resources/modusbox/ca.pem"))
          .toString(),
      });

      // Now ask the TSP to validate the cert, again
      const afterCertValidatedEnrollmentWithCA =
        await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          dfspId,
          enrollmentId
        );

      // Should be ok now
      assert.equal(
        afterCertValidatedEnrollmentWithCA.validationState,
        "VALID",
        JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2)
      );

      // 'VALID' key and signing 'VALID' should give a valid state
      assert.equal(
        afterCertValidatedEnrollmentWithCA.state,
        "CERT_SIGNED",
        JSON.stringify(afterCertValidatedEnrollmentWithCA, null, 2)
      );
    }, 15000);
  }, 30000);
}, 45000);

describe("getDFSPOutboundEnrollments", () => {
  let ctx;
  let validateDfspStub;
  let findIdByDfspIdStub;
  let getDFSPOutboundEnrollmentsStub;

  beforeEach(() => {
    ctx = { pkiEngine: { getDFSPOutboundEnrollments: sinon.stub() } };
    validateDfspStub = sinon.stub(PkiService, "validateDfsp").resolves();
    findIdByDfspIdStub = sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    getDFSPOutboundEnrollmentsStub = ctx.pkiEngine.getDFSPOutboundEnrollments;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should return filtered enrollments when state is provided", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId",
      "active"
    );
    expect(result).to.deep.equal([{ state: "active" }]);
  });

  it("should return all enrollments when state is not provided", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId"
    );
    expect(result).to.deep.equal([{ state: "active" }, { state: "inactive" }]);
  });

  it("should handle different state values", async () => {
    const enrollments = [
      { key: "key1", state: "active" },
      { key: "key2", state: "inactive" }
    ];
    getDFSPOutboundEnrollmentsStub.resolves(enrollments);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId",
      "inactive"
    );
    expect(result).to.deep.equal([{ state: "inactive" }]);
  });

  it("should handle no enrollments", async () => {
    getDFSPOutboundEnrollmentsStub.resolves([]);

    const result = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "dfspId"
    );
    expect(result).to.deep.equal([]);
  });
});

describe("createCSRAndDFSPOutboundEnrollment", () => {
  let ctx;
  let validateDfspStub;
  let createCSRStub;
  let getCSRInfoStub;
  let setDFSPOutboundEnrollmentStub;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
    validateDfspStub = sinon.stub(PkiService, "validateDfsp").resolves();
    createCSRStub = ctx.pkiEngine.createCSR;
    getCSRInfoStub = ctx.pkiEngine.getCSRInfo;
    setDFSPOutboundEnrollmentStub = ctx.pkiEngine.setDFSPOutboundEnrollment;
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully create CSR and enrollment", async () => {
    const mockCSR = "mock-csr";
    const mockPrivateKey = "mock-private-key";
    const mockCSRInfo = { subject: "test" };

    createCSRStub.resolves({ csr: mockCSR, privateKey: mockPrivateKey });
    getCSRInfoStub.returns(mockCSRInfo);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    const result = await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
      ctx,
      "testDfspId"
    );

    expect(result).to.have.property("id");
    expect(result).to.have.property("csr", mockCSR);
    expect(result).to.have.property("csrInfo", mockCSRInfo);
    expect(result).to.have.property("state", "CSR_LOADED");
    expect(result).to.not.have.property("key");
  });

  it("should throw error when validation fails", async () => {
    validateDfspStub.rejects(new Error("Validation failed"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).to.be.rejectedWith("Validation failed");
  });
});

describe("getDFSPOutboundEnrollment", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully retrieve enrollment", async () => {
    const mockEnrollment = {
      id: "test-id",
      state: "CSR_LOADED",
      key: "private-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const result = await DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "test-id"
    );

    expect(result).to.not.have.property("key");
    expect(result).to.have.property("id", "test-id");
    expect(result).to.have.property("state", "CSR_LOADED");
  });

  it("should throw error for invalid enrollment ID", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.rejects(
      new Error("Enrollment not found")
    );

    await expect(
      DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        "testDfspId",
        "invalid-id"
      )
    ).to.be.rejectedWith("Enrollment not found");
  });
});

describe("validateDFSPOutboundEnrollmentCertificate", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully validate certificate", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).to.have.property("validationState", "VALID");
    expect(result.validations).to.deep.equal(mockValidation.validations);
  });

  it("should handle missing DFSP CA", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves(null);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).to.have.property("validationState");
  });
});

describe("addDFSPOutboundEnrollmentCertificate", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getCertInfo: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should successfully add and validate certificate", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result).to.have.property("certificate", mockCertificate);
    expect(result).to.have.property("certInfo", mockCertInfo);
    expect(result).to.have.property("state", "CERT_SIGNED");
    expect(result).to.have.property("validationState", "VALID");
    expect(result).to.not.have.property("key");
  });

  it("should throw ValidationError for invalid certificate content", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.getCertInfo.throws(new Error("Invalid certificate"));

    await expect(
      DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: "invalid-cert" }
      )
    ).to.be.rejectedWith(
      ValidationError,
      "Could not parse the Certificate content"
    );
  });

  it("should handle case when DFSP CA is not available", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "NOT_AVAILABLE" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves(null);
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result.validationState).to.equal("VALID");
    expect(result.state).to.equal("CERT_SIGNED");
  });

  it("should validate enrollment data integrity after certificate addition", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const originalEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
      someExistingProp: "existing-value",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(originalEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result).to.include({
      someExistingProp: "existing-value",
      certificate: mockCertificate,
      state: "CERT_SIGNED",
    });
    expect(result).to.not.have.property("key");
  });

  it("should handle validation failure cases", async () => {
    const mockCertificate = "test-certificate";
    const mockCertInfo = { subject: "test-subject" };
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
    };
    const mockValidation = {
      validations: [{ code: "TEST", result: "INVALID" }],
      validationState: "INVALID",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getCertInfo.returns(mockCertInfo);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns(mockValidation);

    const result =
      await DfspOutboundService.addDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id",
        { certificate: mockCertificate }
      );

    expect(result.validationState).to.equal("INVALID");
    expect(result.state).to.equal("CERT_SIGNED");
    expect(result.validations[0].result).to.equal("INVALID");
  });
});

// Integration test scenarios for DFSP outbound service certificate validation
describe("DfspOutboundService certificate validation scenarios", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle missing certificate when validating enrollment", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      key: "test-key",
      state: "CSR_LOADED",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "MISSING_CERT", result: "INVALID" }],
      validationState: "INVALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).to.have.property("validationState", "INVALID");
    expect(result).to.not.have.property("certificate");
  });

  it("should validate enrollment with expired certificate", async () => {
    const expiredCert = "expired-certificate";
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: expiredCert,
      key: "test-key",
      state: "CERT_SIGNED",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "CERT_EXPIRED", result: "INVALID" }],
      validationState: "INVALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result.validationState).to.equal("INVALID");
    expect(result.validations[0].code).to.equal("CERT_EXPIRED");
  });

  it("should handle concurrent validation requests", async () => {
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    });

    const validationPromises = [
      DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      ),
      DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      )
    ];

    const results = await Promise.all(validationPromises);
    expect(results[0].validationState).to.equal("VALID");
    expect(results[1].validationState).to.equal("VALID");
  });
});

describe("DfspOutboundService error handling", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should handle invalid DFSP ID", async () => {
    sinon
      .stub(PkiService, "validateDfsp")
      .rejects(new Error("Invalid DFSP ID"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
        ctx,
        "invalid-dfsp-id"
      )
    ).to.be.rejectedWith("Invalid DFSP ID");
  });

  it("should handle CSR creation failure", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.createCSR.rejects(new Error("CSR creation failed"));

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).to.be.rejectedWith("CSR creation failed");
  });

  it("should handle enrollment not found error", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.rejects(
      new Error("Enrollment not found")
    );

    await expect(
      DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        "testDfspId",
        "nonexistent-id"
      )
    ).to.be.rejectedWith("Enrollment not found");
  });

  it("should handle database errors when setting enrollment", async () => {
    sinon.stub(PkiService, "validateDfsp").resolves();
    ctx.pkiEngine.createCSR.resolves({
      csr: "test-csr",
      privateKey: "test-key",
    });
    ctx.pkiEngine.getCSRInfo.returns({ subject: "test-subject" });
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.setDFSPOutboundEnrollment.rejects(
      new Error("Database error")
    );

    await expect(
      DfspOutboundService.createCSRAndDFSPOutboundEnrollment(ctx, "testDfspId")
    ).to.be.rejectedWith("Database error");
  });
});

describe("DfspOutboundService data integrity", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollments: sinon.stub(),
        getDFSPOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  it("should maintain enrollment data consistency across operations", async () => {
    const originalEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: "test-cert",
      key: "test-key",
      state: "CERT_SIGNED",
      metadata: { created: "2023-01-01" },
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(originalEnrollment);
    ctx.pkiEngine.validateOutboundEnrollment.returns({
      validations: [{ code: "TEST", result: "OK" }],
      validationState: "VALID",
    });

    const result =
      await DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
        ctx,
        "testDfspId",
        "test-id"
      );

    expect(result).to.include({
      id: originalEnrollment.id,
      csr: originalEnrollment.csr,
      certificate: originalEnrollment.certificate,
      state: originalEnrollment.state,
    });
    expect(result.metadata).to.deep.equal(originalEnrollment.metadata);
  });

  it("should properly filter sensitive data across all operations", async () => {
    const enrollments = [
      { id: "1", key: "secret1", state: "active", sensitiveData: "private1" },
      { id: "2", key: "secret2", state: "inactive", sensitiveData: "private2" }
    ];

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollments.resolves(enrollments);

    const results = await DfspOutboundService.getDFSPOutboundEnrollments(
      ctx,
      "testDfspId"
    );

    results.forEach((enrollment) => {
      expect(enrollment).to.not.have.property("key");
      expect(enrollment).to.not.have.property("sensitiveData");
    });
  });

  it("should handle concurrent enrollment creations efficiently", async () => {
    const numberOfConcurrentRequests = 50;
    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

    ctx.pkiEngine.createCSR.resolves({
      csr: "test-csr",
      privateKey: "test-key",
    });
    ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });
    ctx.pkiEngine.setDFSPOutboundEnrollment.resolves();

    const startTime = process.hrtime();

    const requests = Array(numberOfConcurrentRequests)
      .fill()
      .map(() =>
        DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId"
        )
      );

    const results = await Promise.all(requests);

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000;

    expect(results).to.have.lengthOf(numberOfConcurrentRequests);
    expect(executionTime).to.be.below(2000); // Should handle 50 requests within 2 seconds
  });

  it("should maintain performance with large certificate data", async () => {
    const largeCertificate = "x".repeat(10000); // 10KB certificate
    const mockEnrollment = {
      id: "test-id",
      csr: "test-csr",
      certificate: largeCertificate,
      key: "test-key",
    };

    sinon.stub(PkiService, "validateDfsp").resolves();
    sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
    sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
    ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

    const startTime = process.hrtime();

    const result = await DfspOutboundService.getDFSPOutboundEnrollment(
      ctx,
      "testDfspId",
      "test-id"
    );

    const [seconds, nanoseconds] = process.hrtime(startTime);
    const executionTime = seconds * 1000 + nanoseconds / 1000000;

    expect(result.certificate).to.have.lengthOf(10000);
    expect(executionTime).to.be.below(100); // Should complete within 100ms
  });

  describe("Memory usage tests", () => {
    it("should handle memory efficiently with large datasets", async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Create large dataset
      const largeEnrollmentSet = Array(10000)
        .fill()
        .map((_, i) => ({
          id: `id-${i}`,
          state: "active",
          key: "x".repeat(1000), // 1KB key
          certificate: "x".repeat(1000), // 1KB certificate
        }));

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollments.resolves(largeEnrollmentSet);

      const results = await DfspOutboundService.getDFSPOutboundEnrollments(
        ctx,
        "testDfspId"
      );

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryUsed = (finalMemory - initialMemory) / 1024 / 1024; // Convert to MB

      expect(results).to.have.lengthOf(10000);
      expect(memoryUsed).to.be.below(100); // Should use less than 100MB of additional memory
    });
  });

  describe("Load testing scenarios", () => {
    it("should handle rapid sequential requests", async () => {
      const numberOfRequests = 100;
      const mockEnrollment = {
        id: "test-id",
        csr: "test-csr",
        key: "test-key",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

      const startTime = process.hrtime();

      for (let i = 0; i < numberOfRequests; i++) {
        await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        );
      }

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;
      const averageRequestTime = executionTime / numberOfRequests;

      expect(averageRequestTime).to.be.below(10); // Average request should complete within 10ms
    });

    it("should handle multiple operations in parallel", async () => {
      const operations = [
        DfspOutboundService.getDFSPOutboundEnrollments(ctx, "testDfspId"),
        DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        ),
        DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId"
        ),
        DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
          ctx,
          "testDfspId",
          "test-id"
        )
      ];

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollments.resolves([]);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves({ id: "test-id" });
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });

      const startTime = process.hrtime();

      await Promise.all(operations);

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(executionTime).to.be.below(500); // Should complete all operations within 500ms
    });
  });
});

describe("DfspOutboundService extended scenarios", () => {
  let ctx;

  beforeEach(() => {
    ctx = {
      pkiEngine: {
        getDFSPOutboundEnrollment: sinon.stub(),
        getDFSPOutboundEnrollments: sinon.stub(),
        validateOutboundEnrollment: sinon.stub(),
        setDFSPOutboundEnrollment: sinon.stub(),
        createCSR: sinon.stub(),
        getCSRInfo: sinon.stub(),
        getCertInfo: sinon.stub(),
      },
    };
  });

  afterEach(() => {
    sinon.restore();
  });

  describe("Recovery and resilience tests", () => {
    it("should retry failed operations with exponential backoff", async () => {
      const mockEnrollment = { id: "test-id", state: "CSR_LOADED" };
      let attempts = 0;

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);

      ctx.pkiEngine.getDFSPOutboundEnrollment
        .onFirstCall()
        .rejects(new Error("Network error"))
        .onSecondCall()
        .rejects(new Error("Network error"))
        .onThirdCall()
        .resolves(mockEnrollment);

      const startTime = process.hrtime();

      const result = await DfspOutboundService.getDFSPOutboundEnrollment(
        ctx,
        "testDfspId",
        "test-id"
      );

      const [seconds, nanoseconds] = process.hrtime(startTime);
      const executionTime = seconds * 1000 + nanoseconds / 1000000;

      expect(result).to.deep.equal(mockEnrollment);
      expect(executionTime).to.be.below(1000); // Should complete within 1 second including retries
    });

    it("should handle concurrent certificate validations with rate limiting", async () => {
      const numberOfValidations = 20;
      const mockEnrollment = {
        id: "test-id",
        certificate: "test-cert",
        state: "CERT_SIGNED",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
      ctx.pkiEngine.validateOutboundEnrollment.returns({
        validations: [{ code: "TEST", result: "OK" }],
        validationState: "VALID",
      });

      const startTime = process.hrtime();

      const validations = Array(numberOfValidations)
        .fill()
        .map(() =>
          DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
            ctx,
            "testDfspId",
            "test-id"
          )
        );

      const results = await Promise.all(validations);

      const [seconds] = process.hrtime(startTime);

      results.forEach((result) => {
        expect(result.validationState).to.equal("VALID");
      });
      expect(seconds).to.be.below(2); // Should complete all validations within 2 seconds
    });
  });

  describe("Edge case handling", () => {
    it("should handle extremely large CSR generation requests", async () => {
      const largeSubject = {
        CN: "a".repeat(1000),
        O: "b".repeat(1000),
        OU: "c".repeat(1000),
        C: "US",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: largeSubject });

      const result =
        await DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          { subject: largeSubject }
        );

      expect(result).to.have.property("state", "CSR_LOADED");
      expect(result.csrInfo.subject).to.deep.equal(largeSubject);
    });

    it("should handle enrollment state transitions correctly", async () => {
      const states = ["CSR_LOADED", "CERT_SIGNED", "VALID", "INVALID"];
      const mockEnrollment = { id: "test-id", key: "test-key" };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);

      for (const state of states) {
        mockEnrollment.state = state;
        const result = await DfspOutboundService.getDFSPOutboundEnrollment(
          ctx,
          "testDfspId",
          "test-id"
        );
        expect(result.state).to.equal(state);
      }
    });
  });

  describe("Bulk operation handling", () => {
    it("should process multiple enrollment creations in chunks", async () => {
      const numberOfEnrollments = 100;
      const chunkSize = 10;

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.createCSR.resolves({
        csr: "test-csr",
        privateKey: "test-key",
      });
      ctx.pkiEngine.getCSRInfo.returns({ subject: "test" });

      const startTime = process.hrtime();

      const enrollments = [];
      for (let i = 0; i < numberOfEnrollments; i += chunkSize) {
        const chunk = Array(Math.min(chunkSize, numberOfEnrollments - i))
          .fill()
          .map(() =>
            DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
              ctx,
              "testDfspId"
            )
          );
        enrollments.push(...(await Promise.all(chunk)));
      }

      const [seconds] = process.hrtime(startTime);

      expect(enrollments).to.have.lengthOf(numberOfEnrollments);
      expect(seconds).to.be.below(10); // Should process all chunks within 10 seconds
    });

    it("should handle mixed operation types in sequence", async () => {
      const mockEnrollment = {
        id: "test-id",
        csr: "test-csr",
        certificate: "test-cert",
        key: "test-key",
      };

      sinon.stub(PkiService, "validateDfsp").resolves();
      sinon.stub(PkiService, "getDFSPca").resolves("dfsp-ca");
      sinon.stub(DFSPModel, "findIdByDfspId").resolves(1);
      ctx.pkiEngine.getDFSPOutboundEnrollment.resolves(mockEnrollment);
      ctx.pkiEngine.validateOutboundEnrollment.returns({
        validations: [{ code: "TEST", result: "OK" }],
        validationState: "VALID",
      });

      const operations = [
        () =>
          DfspOutboundService.createCSRAndDFSPOutboundEnrollment(
            ctx,
            "testDfspId"
          ),
        () =>
          DfspOutboundService.getDFSPOutboundEnrollment(
            ctx,
            "testDfspId",
            "test-id"
          ),
        () =>
          DfspOutboundService.validateDFSPOutboundEnrollmentCertificate(
            ctx,
            "testDfspId",
            "test-id"
          ),
        () => DfspOutboundService.getDFSPOutboundEnrollments(ctx, "testDfspId")
      ];

      const results = [];
      for (const operation of operations) {
        results.push(await operation());
      }

      expect(results).to.have.lengthOf(4);
      results.forEach((result) => {
        expect(result).to.not.have.property("key");
      });
    });
  });
});
