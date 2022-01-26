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

const { setupTestDB, tearDownTestDB } = require('./test-database');

const fs = require('fs');
const path = require('path');
const PkiService = require('../src/service/PkiService');
const assert = require('chai').assert;
const ROOT_CA = require('./Root_CA.js');

const ValidationCodes = require('../src/pki_engine/ValidationCodes');
const { createInternalHubCA } = require('../src/service/HubCAService');
const PKIEngine = require('../src/pki_engine/VaultPKIEngine');
const Constants = require('../src/constants/Constants');
const DFSPModel = require('../src/models/DFSPModel');

describe('DfspPkiService', () => {
  before(async function () {
    this.timeout(10000);
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  let dfspId = null;
  const DFSP_TEST_OUTBOUND = 'dfsp.outbound.io';
  beforeEach('creating ENV and DFSP', async function () {
    this.timeout(30000);

    await createInternalHubCA(ROOT_CA);

    const dfsp = {
      dfspId: DFSP_TEST_OUTBOUND,
      name: 'DFSP used to test outbound flow'
    };
    const resultDfsp = await PkiService.createDFSP(dfsp);
    dfspId = resultDfsp.id;

    const pkiEngine = new PKIEngine(Constants.vault);
    await pkiEngine.connect();
    const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
    try { await pkiEngine.deleteAllDFSPData(dbDfspId); } catch (e) { }
  });

  afterEach('tearing down ENV and DFSP', async () => {
    await PkiService.deleteDFSP(dfspId);
  });

  const ROOT_CA_PATH = './resources/digicert/digicert.global.root.pem';
  const INTERMEDIATE_CERT_PATH = './resources/amazon.com/amazon.chain.pem';
  const SELF_SIGNED_ROOT_CA_PATH = './resources/orange/Orange_Internal_G2-ROOT.pem';
  const SELF_SIGNED_INTERMEDIATE_PATH = './resources/orange/Orange_Internal_G2-Server_CA.pem';

  it('should validate a rootCertificate', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, ROOT_CA_PATH)).toString(),
    };
    const result = await PkiService.setDFSPca(dfspId, body);
    const validationRootCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code
    );
    assert.equal(result.validationState, 'VALID');
    assert.equal(validationRootCertificate.details, 'VALID(SELF_SIGNED)');
  }).timeout(15000);

  it('should not validate an intermediate certificate signed by a non publicly trusted root certificate', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, SELF_SIGNED_INTERMEDIATE_PATH)).toString(),
    };
    const result = await PkiService.setDFSPca(dfspId, body);
    assert.equal(result.validationState, 'INVALID');
  }).timeout(15000);

  it('should validate an intermediate signed by a globally trusted CA', async () => {
    const body = {
      rootCertificate: null,
      intermediateChain: fs.readFileSync(path.join(__dirname, INTERMEDIATE_CERT_PATH)).toString()
    };
    const result = await PkiService.setDFSPca(dfspId, body);
    const validationIntermediateChainCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code
    );

    assert.equal(validationIntermediateChainCertificate.result, 'VALID');
    assert.equal(result.validationState, 'VALID');
  }).timeout(15000);

  it('should validate an intermediate signed by a self-signed root', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, SELF_SIGNED_ROOT_CA_PATH)).toString(),
      intermediateChain: fs.readFileSync(path.join(__dirname, SELF_SIGNED_INTERMEDIATE_PATH)).toString()
    };
    const result = await PkiService.setDFSPca(dfspId, body);
    const validationRootCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code
    );
    assert.equal(result.validationState, 'VALID');
    assert.equal(validationRootCertificate.details, 'VALID(SELF_SIGNED)');
  }).timeout(15000);
}).timeout(15000);
