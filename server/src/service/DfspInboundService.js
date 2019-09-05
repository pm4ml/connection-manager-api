'use strict';
const DfspInboundEnrollmentModel = require('../models/DfspInboundEnrollmentModel');
const DFSPModel = require('../models/DFSPModel');
const PkiService = require('./PkiService');
const InternalError = require('../errors/InternalError');
const InvalidEntityError = require('../errors/InvalidEntityError');
const ValidationError = require('../errors/ValidationError');
const CAType = require('../models/CAType');
const PKIEngine = require('../pki_engine/EmbeddedPKIEngine');
const CertificatesAuthoritiesModel = require('../models/CertificatesAuthoritiesModel');
const Joi = require('joi');

const enrollmentCertificate = Joi.object().description('Enrollment Certificatet').keys({
  certificate: Joi.string().description('certificate').required(),
  hubCAId: Joi.number().description('the id of the selected EXTERNAL Hub CA').required(),
});

/**
 * Create DFSP Inbound enrollment ( DFSP API )
 * The DFSP operator sends the info needed to configure the inbound PKI infra
 * Saves the enrollment info and sets its state to 'CSR_LOADED'
 * envId String ID of environment
 * dfspId String DFSP id
 * body DFSPInboundCreate DFSP inbound initial info
 * returns ObjectCreatedResponse
 **/
exports.createDFSPInboundEnrollment = async function (envId, dfspId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  let csrInfo;
  try {
    csrInfo = await PKIEngine.getCSRInfo(body.clientCSR);
  } catch (error) {
    throw new ValidationError('Could not parse the CSR content', error);
  }

  // FIXME: create an Enrollment class with inbound and outbound as children
  let enrollment = {
    csr: body.clientCSR
  };

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateInboundEnrollment(enrollment);
  let rawDfspId = await DFSPModel.findIdByDfspId(envId, dfspId);

  let values = {
    env_id: envId,
    dfsp_id: rawDfspId,
    csr: body.clientCSR,
    csr_info: JSON.stringify(csrInfo),
    state: 'CSR_LOADED',
    validations: JSON.stringify(validations),
    validationState
  };

  let result = await DfspInboundEnrollmentModel.create(values);
  if (result.length === 1) {
    return { id: result[0] };
  } else {
    throw new InternalError('More than one row created');
  }
};

/**
 * Get a list of DFSP Inbound enrollments
 */
exports.getDFSPInboundEnrollments = async function (envId, dfspId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let rows = await DfspInboundEnrollmentModel.findAllDfsp(envId, dfspId);
  return rows.map(row => rowToObject(row));
};

/**
 * Get a DFSP Inbound enrollment
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns InboundEnrollment
 **/
exports.getDFSPInboundEnrollment = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);
  let row = await DfspInboundEnrollmentModel.findById(enId);
  return rowToObject(row);
};

/**
 * Signs the CSR and adds the certificate to the enrollment
 * The TSP signs the CSR with the environment CA, creating a certificate. It adds this certificate to the enrollment and updates its state to CERT_SIGNED
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * returns ApiResponse
 **/
exports.signDFSPInboundEnrollment = async function (envId, dfspId, enId) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  let row = await DfspInboundEnrollmentModel.getCaAndCSR(enId, envId);
  if (row.length === 0) {
    throw new InvalidEntityError(`Could not retrieve current CA for the endpoint ${enId}, dfsp id ${dfspId}, environment id ${envId}`);
  }

  let { csr } = row[0];

  let pkiEngine = await CertificatesAuthoritiesModel.getPkiEngineForEnv(envId);
  let newCert = await pkiEngine.sign(csr);
  let certInfo = await PKIEngine.getCertInfo(newCert);

  const inboundEnrollment = {
    csr,
    certificate: newCert,
    caType: CAType.EXTERNAL
  };

  const validatingPkiEngine = new PKIEngine();
  let { validations, validationState } = await validatingPkiEngine.validateInboundEnrollment(inboundEnrollment);
  let values = {
    cert: newCert,
    cert_info: JSON.stringify(certInfo),
    state: 'CERT_SIGNED',
    validations: JSON.stringify(validations),
    validationState
  };

  await DfspInboundEnrollmentModel.update(enId, values);
  let updatedRow = await DfspInboundEnrollmentModel.findById(enId);
  return rowToObject(updatedRow);
};

/**
 * Adds the certificate to the enrollment and updates its state to CERT_SIGNED
 *
 * envId String ID of environment
 * dfspId String DFSP id
 * enId String Enrollment id
 * body Certificate Certificate
 * returns the enrollment
 **/
exports.addDFSPInboundEnrollmentCertificate = async function (envId, dfspId, enId, body) {
  await PkiService.validateEnvironmentAndDfsp(envId, dfspId);

  const result = Joi.validate(body, enrollmentCertificate);
  if (result.error) {
    throw new ValidationError('Invalid Enrollment Certificate Input', result.error.details);
  }

  let certificate = body.certificate;
  let hubCAId = body.hubCAId;

  let certInfo;
  try {
    certInfo = await PKIEngine.getCertInfo(certificate);
  } catch (error) {
    throw new ValidationError('Could not parse the Certificate content', error);
  }

  const inboundEnrollment = await exports.getDFSPInboundEnrollment(envId, dfspId, enId);

  inboundEnrollment.certificate = certificate;

  const pkiEngine = new PKIEngine();
  let { validations, validationState } = await pkiEngine.validateInboundEnrollment(inboundEnrollment);

  let values = {
    cert: certificate,
    cert_info: JSON.stringify(certInfo),
    state: 'CERT_SIGNED',
    validations: JSON.stringify(validations),
    validationState,
    hub_issuer_ca_id: hubCAId
  };

  await DfspInboundEnrollmentModel.update(enId, values);
  return exports.getDFSPInboundEnrollment(envId, dfspId, enId);
};

const rowToObject = (row) => {
  return {
    id: row.id,
    csr: row.csr,
    certificate: row.cert,
    csrInfo: row.csr_info && (typeof row.csr_info === 'string') ? JSON.parse(row.csr_info) : {},
    certInfo: row.cert_info && (typeof row.cert_info === 'string') ? JSON.parse(row.cert_info) : {},
    validationState: row.validationState,
    validations: row.validations && (typeof row.validations === 'string') ? JSON.parse(row.validations) : {},
    state: row.state,
    hubCAId: row.hub_issuer_ca_id
  };
};
