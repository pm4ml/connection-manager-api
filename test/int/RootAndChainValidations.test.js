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

const { setupTestDB, tearDownTestDB } = require('../int/test-database.js');

const fs = require('fs');
const path = require('path');
const PkiService = require('../../src/service/PkiService.js');
const ROOT_CA = require('../int/Root_CA.js');

const ValidationCodes = require('../../src/pki_engine/ValidationCodes.js');
const { createInternalHubCA } = require('../../src/service/HubCAService.js');
const DFSPModel = require('../../src/models/DFSPModel.js');
const { createContext, destroyContext } = require('../int/context.js');
const database = require('../../src/db/database.js');
const { createUniqueDfsp } = require('./test-helpers.js');

describe('DfspPkiService', () => {
  let ctx;
  beforeAll(async function () {
    await setupTestDB();
    await database.knex('dfsps').del();
    ctx = await createContext();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  let dfspId = null;
  const DFSP_TEST_OUTBOUND = 'dfsp.outbound.io';
  beforeEach(async function () {
    await createInternalHubCA(ctx, ROOT_CA);

    const dfsp = createUniqueDfsp();
    const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
    dfspId = resultDfsp.id;

    const dbDfspId = await DFSPModel.findIdByDfspId(dfspId);
    try { await ctx.pkiEngine.deleteAllDFSPData(dbDfspId); } catch (e) { }
  }, 30000);

  afterEach(async () => {
    await PkiService.deleteDFSP(ctx, dfspId);
    await database.knex('dfsps').del();
  });

  const ROOT_CA_PATH = './resources/digicert/digicert.global.root.pem';
  const INTERMEDIATE_CERT_PATH = './resources/amazon.com/amazon.chain.pem';
  const SELF_SIGNED_ROOT_CA_PATH = './resources/orange/Orange_Internal_G2-ROOT.pem';
  const SELF_SIGNED_INTERMEDIATE_PATH = './resources/orange/Orange_Internal_G2-Server_CA.pem';

  it('should validate a rootCertificate', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, ROOT_CA_PATH)).toString(),
    };
    const result = await PkiService.setDFSPca(ctx, dfspId, body);
    const validationRootCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code
    );
    expect(result.validationState).toBe('VALID');
    expect(validationRootCertificate.details).toBe('VALID(SELF_SIGNED)');
  }, 15000);

  it('should not validate an intermediate certificate signed by a non publicly trusted root certificate', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, SELF_SIGNED_INTERMEDIATE_PATH)).toString(),
    };
    const result = await PkiService.setDFSPca(ctx, dfspId, body);
    expect(result.validationState).toBe('INVALID');
  }, 15000);

  it('should validate an intermediate signed by a globally trusted CA', async () => {
    const body = {
      rootCertificate: null,
      intermediateChain: fs.readFileSync(path.join(__dirname, INTERMEDIATE_CERT_PATH)).toString()
    };
    const result = await PkiService.setDFSPca(ctx, dfspId, body);
    const validationIntermediateChainCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_CHAIN_CERTIFICATES.code
    );

    expect(validationIntermediateChainCertificate.result).toBe('VALID');
    expect(result.validationState).toBe('VALID');
  }, 15000);

  it('should validate an intermediate signed by a self-signed root', async () => {
    const body = {
      rootCertificate: fs.readFileSync(path.join(__dirname, SELF_SIGNED_ROOT_CA_PATH)).toString(),
      intermediateChain: fs.readFileSync(path.join(__dirname, SELF_SIGNED_INTERMEDIATE_PATH)).toString()
    };
    const result = await PkiService.setDFSPca(ctx, dfspId, body);
    const validationRootCertificate = result.validations.find((element) =>
      element.validationCode === ValidationCodes.VALIDATION_CODES.VERIFY_ROOT_CERTIFICATE.code
    );
    expect(result.validationState).toBe('VALID');
    expect(validationRootCertificate.details).toBe('VALID(SELF_SIGNED)');
  }, 15000);
}, 15000);
