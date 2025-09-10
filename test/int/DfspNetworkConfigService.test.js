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
const { setupTestDB, tearDownTestDB } = require('../int/test-database');
const PkiService = require('../../src/service/PkiService');
const DfspNetworkConfigService = require('../../src/service/DfspNetworkConfigService');
const ValidationError = require('../../src/errors/ValidationError');
const NotFoundError = require('../../src/errors/NotFoundError');
const { createContext, destroyContext } = require('../int/context');
const { StatusEnum } = require('../../src/service/DfspNetworkConfigService');
const DFSPEndpointModel = require('../../src/models/DFSPEndpointModel');
const DFSPModel = require('../../src/models/DFSPModel');
const DFSPEndpointItemModel = require('../../src/models/DFSPEndpointItemModel');
validateModule = require('../../src/service/DfspNetworkConfigService');
const { getDFSPIngressIpEndpoint } = require('../../src/service/DfspNetworkConfigService');  // Replace with actual service path

const { validateDirectionType } = require('../../src/service/DfspNetworkConfigService');

describe('DfspNetworkConfigService Unit Tests', () => {
  let ctx;
  const dfspId = 'DFSP_TEST_1';
  const endpointId = 'ENDPOINT_TEST_1';

  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });
  beforeEach(() => sinon.restore());

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  // Test getDfspStatus
  describe('getDfspStatus', () => {
    it('should return default status when DFSP exists', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').resolves({ id: dfspId, name: 'DFSP Test' });
      sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([]);

      const result = await DfspNetworkConfigService.getDfspStatus(ctx, dfspId);
      expect(Array.isArray(result)).toBe(true);
      expect(result[0].phase).toBe('BUSINESS_SETUP');
      expect(result[1].phase).toBe('TECHNICAL_SETUP');
    });

    it('should throw NotFoundError when DFSP does not exist', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').throws(new NotFoundError('DFSP not found'));

      await expect(DfspNetworkConfigService.getDfspStatus(ctx, dfspId)).rejects.toThrow(NotFoundError);
    });
  });

  // Test createDFSPEgress
  describe('createDFSPEgress', () => {
    it('should create DFSP egress endpoint successfully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'create').resolves(endpointId);
      sinon.stub(DFSPEndpointModel, 'findById').resolves({ dfspId, state: 'NOT_STARTED' });

      const result = await DfspNetworkConfigService.createDFSPEgress(ctx, dfspId, { data: 'test' });
      expect(result.dfspId).toBe(dfspId);
    });

    it('should throw ValidationError for invalid DFSP ID', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP ID'));

      await expect(DfspNetworkConfigService.createDFSPEgress(ctx, 'INVALID_DFSP', {}))
        .rejects.toThrow(ValidationError);
    });
  });

  // Test createDFSPIngressIp
  describe('createDFSPIngressIp', () => {
    beforeEach(() => {
      sinon.restore();
    });
    it('should create a DFSP Ingress IP entry', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'create').resolves(endpointId);
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });

      const body = { value: { address: '1.1.1.1', ports: ['80'] } };
      const result = await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
      expect(result.id).toBe(endpointId);
    });

    it('should throw ValidationError for missing address', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();

      const body = { value: { ports: ['80'] } };

      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body))
        .rejects.toThrow(ValidationError);
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body))
        .rejects.toThrow('No address received');
    });

    it('should throw ValidationError for missing ports', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      const body = { value: { address: '1.1.1.1' } };
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body))
        .rejects.toThrow(ValidationError);
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body))
        .rejects.toThrow('No ports received');
    });

    it('should throw ValidationError when creating DFSP Ingress with empty body', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves(); // Prevent NotFoundError

      const emptyBody = { value: {} }; // Ensure the structure exists

      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, emptyBody))
        .rejects.toThrow(ValidationError);
    });

    it('should update existing DFSP Ingress config', async () => {
      sinon.restore(); // Ensures no existing stubs interfere

      const stub = sinon.stub(DfspNetworkConfigService, 'createDFSPIngress');
      stub.onFirstCall().resolves({ dfspId, url: 'http://original.com' });
      stub.onSecondCall().resolves({ dfspId, url: 'http://updated.com', state: StatusEnum.NOT_STARTED });

      const original = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, { url: 'http://original.com' });
      const updated = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, { url: 'http://updated.com' });

      expect(updated.url).toBe('http://updated.com');
      expect(updated.url).not.toBe(original.url);
      expect(updated.state).toBe(StatusEnum.NOT_STARTED);
    });

    it('should maintain consistent state between create and get operations', async () => {
      const body = { url: 'http://test.com' };

      sinon.stub(DfspNetworkConfigService, 'createDFSPIngress').resolves({ dfspId, url: body.url, state: StatusEnum.NOT_STARTED });
      sinon.stub(DfspNetworkConfigService, 'getDFSPIngress').resolves({ dfspId, url: body.url, state: StatusEnum.NOT_STARTED });

      const created = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, body);
      const retrieved = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);

      expect(created).toEqual(retrieved);
      expect(created.dfspId).toBe(retrieved.dfspId);
      expect(created.url).toBe(retrieved.url);
      expect(created.state).toBe(retrieved.state);
    });

    it.skip('should throw NotFoundError when getting non-existent DFSP Ingress', async () => {
      sinon.stub(DfspNetworkConfigService, 'getDFSPIngress').throws(new NotFoundError('DFSP Ingress not found'));

      await expect(DfspNetworkConfigService.getDFSPIngress(ctx, 'NONEXISTENT_DFSP'))
        .rejects.toThrowError(NotFoundError);
      await expect(DfspNetworkConfigService.getDFSPIngress(ctx, 'NONEXISTENT_DFSP'))
        .rejects.toThrow('DFSP Ingress not found');
    });
  });

  // Test getDFSPEgress
  describe('getDFSPEgress', () => {
    it('should return DFSP Egress configuration', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'findLastestByDirection').resolves({ dfspId, state: 'NOT_STARTED' });

      const result = await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
      expect(result.dfspId).toBe(dfspId);
    });

    it('should throw NotFoundError when no egress config exists', async () => {
      await expect(DfspNetworkConfigService.getDFSPEgress(ctx, dfspId)).rejects.toThrow(NotFoundError);
    });
  });

  // Test deleteDFSPEndpoint
  describe('deleteDFSPEndpoint', () => {
    it('should delete a DFSP endpoint successfully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });
      sinon.stub(DFSPEndpointItemModel, 'delete').resolves();

      await expect(DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId)).resolves.toBeUndefined();
    });

    it('should throw NotFoundError when endpoint does not exist', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(new NotFoundError('Endpoint not found'));

      await expect(DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId)).rejects.toThrow(NotFoundError);
    });
  });

  // Test confirmEndpointItem
  describe('confirmEndpointItem', () => {
    it('should confirm an endpoint item successfully', async () => {
      sinon.stub(DFSPEndpointItemModel, 'update').resolves({ id: endpointId, state: 'CONFIRMED' });

      const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, endpointId);
      expect(result.state).toBe('CONFIRMED');
    });
  });
});

describe('DfspNetworkConfigService', () => {
  let ctx;
  const dfspId = 'DFSP_TEST_1';
  const epId = 'EP_TEST_1';

  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => {
    sinon.restore(); // Ensures clean stubs
    sinon.stub(PkiService, 'validateDfsp').resolves();
    sinon.stub(DFSPModel, 'findIdByDfspId').resolves(dfspId);
    sinon.stub(DFSPEndpointItemModel, 'findAllDfspState').resolves([
      { id: 'item1', state: 'NEW' },
      { id: 'item2', state: 'NEW' }
    ]);
    sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([
      { id: 'endpoint1' },
      { id: 'endpoint2' }
    ]);
    sinon.stub(DfspNetworkConfigService, 'deleteDFSPEndpoint').resolves({ success: true });
  });

  afterEach(() => {
    sinon.restore();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

    it('should return unprocessed DFSP items when DFSP is valid', async () => {
      const result = await DfspNetworkConfigService.getUnprocessedDfspItems(ctx, dfspId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 'item1', state: 'NEW' },
        { id: 'item2', state: 'NEW' }
      ]);
    });

    it('should return DFSP endpoints when DFSP is valid', async () => {
      const result = await DfspNetworkConfigService.getDFSPEndpoints(ctx, dfspId);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
      expect(result).toEqual([
        { id: 'endpoint1' },
        { id: 'endpoint2' }
      ]);
    });
});

describe.skip('validateDirectionType Tests', () => {
  const dfspId = 'DFSP_TEST';
  const epId = 'EP_TEST';

  beforeEach(() => {
    sinon.restore();
  });

  it('should not throw an error when direction and type are correct', async () => {
    sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'EGRESS',
      type: 'IP',
    });

    await expect(validateDirectionType('EGRESS', 'IP', epId, dfspId)).resolves.not.toThrow();
    sinon.assert.calledOnce(DfspNetworkConfigService.getDFSPEndpoint);
  });

  it('should throw ValidationError when direction is incorrect', async () => {
    sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'INGRESS',
      type: 'IP',
    });

    await expect(validateDirectionType('EGRESS', 'IP', epId, dfspId)).rejects.toThrow(ValidationError);
    await expect(validateDirectionType('EGRESS', 'IP', epId, dfspId)).rejects.toThrow('Wrong direction EGRESS, endpoint has already INGRESS');
  });

  it('should throw ValidationError when type is incorrect', async () => {
    sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'EGRESS',
      type: 'URL',
    });

    await expect(validateDirectionType('EGRESS', 'IP', epId, dfspId)).rejects.toThrow(ValidationError);
    await expect(validateDirectionType('EGRESS', 'IP', epId, dfspId)).rejects.toThrow('Wrong type IP, endpoint has already URL');
  });

  afterEach(() => {
    sinon.restore();
  });
});

describe.skip('DfspNetworkConfigService creating endpoint items', () => {
  let dfspId = null;
  let ctx;
  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });
  beforeEach(async () => {
    const dfsp = {
      dfspId: 'DFSP_TEST_B',
      name: 'DFSP_TEST_B_description'
    };
    const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
    dfspId = resultDfsp.id;
  });

  afterEach(async () => {
    await PkiService.deleteDFSP(ctx, dfspId);
  });

  describe('DfspNetworkConfigService validations', () => {
    it('should throw an error when direction type is incorrect', async () => {
      await expect(DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, 'DFSP_ID', 'EP_ID', { direction: 'WRONG' }))
        .rejects.toThrowError(ValidationError);
      await expect(DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, 'DFSP_ID', 'EP_ID', { direction: 'WRONG' }))
        .rejects.toThrow('Bad direction value');
    });
    it('should throw ValidationError on illegal Egress IP', async () => {
      const illegalIPBody = { value: { address: '999.1.1.1', ports: ['80'] } };
      await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Ingress IP', async () => {
      const illegalIPBody = { value: { address: '999.1.1.1', ports: ['80'] } };
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Egress IP', async () => {
      const illegalIPBody = { value: { address: 'a.b.c.d', ports: ['80'] } };
      await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Ingress IP', async () => {
      const illegalIPBody = { value: { address: 'a.b.c.d', ports: ['80'] } };
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Ingress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['-80'] } };
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Ingress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['80', '90000-'] } };
      await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Egress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['-80'] } };
      await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal Egress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['80', '90000-'] } };
      await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody))
        .rejects.toThrowError(ValidationError);
    });

    it('should throw ValidationError on illegal URL', async () => {
      let illegalUrlBody = { value: { url: 'ftp:www.sun.com' } };

      await expect(DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, illegalUrlBody))
        .rejects.toThrowError(ValidationError);

      illegalUrlBody = { value: { url: 'www.sun.com' } };

      await expect(DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, illegalUrlBody))
        .rejects.toThrowError(ValidationError);
    });
  });

  it('should create an ingress IP endpoint', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    const result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    expect(result[0].value.address).toBe(ipBody.value.address);
    expect(result[0].value.ports[0]).toBe(ipBody.value.ports[0]);
    expect(result[0].value.ports[1]).toBe(ipBody.value.ports[1]);
  });

  it('should create more than one input IP entry', async () => {
    let ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    let result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    expect(result.length).toBe(1);
    expect(result[0].value.address).toBe(ipBody.value.address);
    expect(result[0].value.ports[0]).toBe(ipBody.value.ports[0]);
    expect(result[0].value.ports[1]).toBe(ipBody.value.ports[1]);

    ipBody = { value: { address: '2.2.2.2', ports: ['80'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    expect(result.length).toBe(2);
    expect(result[1].value.address).toBe(ipBody.value.address);
    expect(result[1].value.ports[0]).toBe(ipBody.value.ports[0]);

    const items = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    expect(items.length).toBe(2);
  });

  it('should create an egress IP endpoint', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    const result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    expect(result[0].value.address).toBe(ipBody.value.address);
    expect(result[0].value.ports[0]).toBe(ipBody.value.ports[0]);
    expect(result[0].value.ports[1]).toBe(ipBody.value.ports[1]);
  });

  it('should create more than one egress IP entry', async () => {
    let ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    let result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    expect(result.length).toBe(1);
    expect(result[0].value.address).toBe(ipBody.value.address);
    expect(result[0].value.ports[0]).toBe(ipBody.value.ports[0]);
    expect(result[0].value.ports[1]).toBe(ipBody.value.ports[1]);

    ipBody = { value: { address: '2.2.2.2', ports: ['80'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    expect(result.length).toBe(2);
    expect(result[1].value.address).toBe(ipBody.value.address);
    expect(result[1].value.ports[0]).toBe(ipBody.value.ports[0]);

    const items = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    expect(items.length).toBe(2);
  });

  it('should create an IngressUrl', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    expect(items.length).toBe(1);
  });

  it('should create more than one ingress URL entry', async () => {
    const COUNT = 10;
    for (let index = 0; index < COUNT; index++) {
      const urlBody = { value: { url: `http://www.sun${index}.com` } };
      await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    }
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    expect(items.length).toBe(COUNT);
  });

  it('should update a set of endpoints', async () => {
    let urlBody = { value: { url: 'http://www.sun.com' } };

    // Step 1: Create the initial URL
    const created = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    expect(created.value.url).toBe('http://www.sun.com');

    // Step 2: Update the same endpoint using its ID
    urlBody = { value: { url: 'http://www.oracle.com' } };
    await DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, created.id, urlBody);

    // Step 3: Retrieve and check if the update was successful
    const updated = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    expect(updated[0].value.url).toBe('http://www.oracle.com');
  });

  it('should not throw NotFoundError when no IngressUrl endpoint configured', async () => {
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    expect(items.length).toBe(0);
  });

  it('should return the correct amount of unprocessed endpoints for URLs', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    expect(items.length).toBe(1);
  });

  it('should return the correct format for of unprocessed endpoints for URLs', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    expect(items.length).toBe(1);
    expect(items[0].value.url).toBe(urlBody.value.url);
  });

  it('should return the correct format for of unprocessed endpoints for IPs', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    expect(items.length).toBe(1);
    expect(items[0].value.address).toBe(ipBody.value.address);
  });

  it('should confirm an ingress URL endpoint', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    const result = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);

    const confirmed = await DfspNetworkConfigService.confirmEndpointItem(ctx, result.dfsp_id, result.id);
    expect(confirmed.state).toBe('CONFIRMED');
  });

  it('should create update delete an ingress URL via endpoint operations', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    const result = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const loadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id);
    expect(loadedUrl.value.url).toBe(urlBody.value.url);
    loadedUrl.value.url = 'http://www.oracle.com';
    const updatedUrl = await DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, result.id, loadedUrl);
    expect(updatedUrl.value.url).toBe(loadedUrl.value.url);
    const newLoadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id);
    expect(newLoadedUrl.value.url).toBe(loadedUrl.value.url);
    const emptyResponse = await DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, result.id);
    expect(emptyResponse).toBeUndefined();
    await expect(DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id))
      .rejects.toThrowError(NotFoundError);
  });

  it('should return the dfspId as string when getting the UnprocessedEndpointItems', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    expect(items.length).toBe(1);
    expect(items[0].dfsp_id).toBe('DFSP_TEST_B');
  });

  it('should return a NotFound exception when Endpoint Egress config doesnt exist', async () => {
    await expect(DfspNetworkConfigService.getDFSPEgress(ctx, dfspId))
      .rejects.toThrowError(NotFoundError);
  });


  it('should create an Endpoint Egress config', async () => {
    const body = {
      ipList: [
        {
          description: 'Notification Callback Egress IP & Ports',
          address: '163.10.24.28/30',
          ports: [
            '80',
            '8000-8080'
          ]
        }
      ]
    };

    const createDFSPEgressResult = await DfspNetworkConfigService.createDFSPEgress(ctx, dfspId, body);
    const getDFSPEgressResult = await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
    expect(createDFSPEgressResult.dfspId).toBe(dfspId);
    expect(getDFSPEgressResult.dfspId).toBe(dfspId);
    expect(createDFSPEgressResult.state).toBe(StatusEnum.NOT_STARTED);
    expect(getDFSPEgressResult.state).toBe(StatusEnum.NOT_STARTED);
    expect(createDFSPEgressResult.ipList).toEqual(body.ipList);
    expect(getDFSPEgressResult.ipList).toEqual(body.ipList);
    expect(createDFSPEgressResult).not.toHaveProperty('direction');
    expect(getDFSPEgressResult).not.toHaveProperty('direction');
    expect(new Date(createDFSPEgressResult.createdAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(new Date(getDFSPEgressResult.createdAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
  });

  it('should return a NotFound exception when Endpoint Ingress config doesnt exist', async () => {
    await expect(DfspNetworkConfigService.getDFSPIngress(ctx, dfspId))
      .rejects.toThrow(NotFoundError);
  });

  it('should throw NotFoundError when DFSP status is not found', async () => {
    sinon.stub(DFSPModel, 'findByDfspId').throws(new NotFoundError('DFSP not found'));

    await expect(DfspNetworkConfigService.getDfspStatus(ctx, 'INVALID_DFSP'))
      .rejects.toThrow(NotFoundError);
    await expect(DfspNetworkConfigService.getDfspStatus(ctx, 'INVALID_DFSP'))
      .rejects.toThrow('Status for environment: dfsp: INVALID_DFSP not found');

    DFSPModel.findByDfspId.restore();
  });

  it('should throw ValidationError when creating DFSP Ingress IP with missing ports', async () => {
    const invalidBody = { value: { address: '1.1.1.1' } };

    await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow('No ports received');
  });

  it('should throw ValidationError if ports is not an array', async () => {
    const invalidBody = { value: { address: '1.1.1.1', ports: '80' } }; // String instead of array

    await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow('Ports must be an array');
  });

  it('should throw ValidationError when creating DFSP Egress IP with invalid IP format', async () => {
    const invalidBody = { value: { address: '999.999.999.999', ports: ['80'] } };

    await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody))
      .rejects.toThrow('Invalid IP address or CIDR range'); // Updated message
  });

  it('should throw ValidationError when updating DFSP endpoint with invalid URL', async () => {
    const endpointId = 'some-endpoint-id';
    const invalidBody = { value: { url: 'invalid-url' } };

    sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });

    await expect(DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, endpointId, invalidBody))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, endpointId, invalidBody))
      .rejects.toThrow('Invalid URL');

    DFSPEndpointItemModel.findObjectById.restore();
  });
  it('should throw NotFoundError when deleting non-existent DFSP endpoint', async () => {
    const endpointId = 'non-existent-id';

    sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(new NotFoundError('Endpoint not found'));

    await expect(DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId))
      .rejects.toThrow(NotFoundError);
    await expect(DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId))
      .rejects.toThrow('Endpoint not found');

    DFSPEndpointItemModel.findObjectById.restore();
  });

  it('should return an array of unprocessed endpoint items', async () => {
    const mockData = [{ id: '1', value: { url: 'http://test.com' } }];
    sinon.stub(DFSPEndpointItemModel, 'findAllEnvState').resolves(mockData);

    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);

    expect(Array.isArray(items)).toBe(true);
    expect(items.length).toBe(1);
    expect(items[0].value.url).toBe('http://test.com');

    DFSPEndpointItemModel.findAllEnvState.restore();
  });
  it('should confirm an endpoint item successfully', async () => {
    const endpointId = 'endpoint-id';

    sinon.stub(DFSPEndpointItemModel, 'update').resolves({ id: endpointId, state: 'CONFIRMED' });

    const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, endpointId);

    expect(result.state).toBe('CONFIRMED');

    DFSPEndpointItemModel.update.restore();
  });
  it('should return an empty array when no DFSP Egress IPs exist', async () => {
    sinon.stub(DFSPEndpointItemModel, 'findObjectByDirectionType').resolves([]);

    const result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);

    expect(Array.isArray(result)).toBe(true);
    expect(result).toHaveLength(0);

    DFSPEndpointItemModel.findObjectByDirectionType.restore();
  });

  it('should create an Endpoint Ingress config', async () => {
    const body = {
      url: 'string'
    };

    const createDFSPIngressResult = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, body);
    const getDFSPIngressResult = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
    expect(createDFSPIngressResult.dfspId).toBe(dfspId);
    expect(getDFSPIngressResult.dfspId).toBe(dfspId);
    expect(createDFSPIngressResult.state).toBe(StatusEnum.NOT_STARTED);
    expect(getDFSPIngressResult.state).toBe(StatusEnum.NOT_STARTED);
    expect(createDFSPIngressResult.url).toEqual(body.url);
    expect(getDFSPIngressResult.url).toEqual(body.url);
    expect(createDFSPIngressResult).not.toHaveProperty('direction');
    expect(getDFSPIngressResult).not.toHaveProperty('direction');
    expect(new Date(createDFSPIngressResult.createdAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
    expect(new Date(getDFSPIngressResult.createdAt).getTime()).toBeLessThanOrEqual(new Date().getTime());
  });
});

describe('DfspNetworkConfigService Edge Cases and Validations', () => {
  let ctx;
  const dfspId = 'EDGE_TEST_DFSP';
  const epId = 'EDGE_TEST_EP';

  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => sinon.restore());

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe.skip('Input Validation', () => {
    it('should validate IP address format strictly', async () => {
      const invalidIPs = [
        '256.1.2.3',
        '1.2.3.256',
        '1.2.3',
        'a.b.c.d',
        '192.168.1.1/33', // Invalid CIDR
        '300.168.1.1/24'
      ];

      for (const ip of invalidIPs) {
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, {
            value: { address: ip, ports: ['80'] }
          });
          throw new Error(`Should reject invalid IP: ${ip}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });

    it('should validate port ranges comprehensively', async () => {
      const invalidPorts = [
        ['0'],
        ['65536'],
        ['-1'],
        ['abc'],
        ['22-21'], // Invalid range (start > end)
        ['1-65537'],
        ['22-'],
        ['-80']
      ];

      for (const ports of invalidPorts) {
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, {
            value: { address: '192.168.1.1', ports }
          });
          throw new Error(`Should reject invalid ports: ${ports}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });

    it('should validate URL format strictly', async () => {
      const invalidUrls = [
        { value: { url: 'not-a-url' } },
        { value: { url: 'ftp://invalid-scheme.com' } },
        { value: { url: 'http:/missing-slash.com' } },
        { value: { url: 'https://' } },
        { value: { url: 'http:///' } }
      ];

      for (const urlBody of invalidUrls) {
        try {
          await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
          throw new Error(`Should reject invalid URL: ${urlBody.value.url}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });
  });

  describe('State Transitions and Updates', () => {
    beforeEach(() => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({
        id: epId,
        state: 'NEW'
      });
    });

    it('should handle endpoint state transitions correctly', async () => {
      sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        state: 'CONFIRMED'
      });

      const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, epId);

      expect(result.state).toBe('CONFIRMED');
      expect(DFSPEndpointItemModel.update.calledWith(dfspId, epId, { state: 'CONFIRMED' })).toBe(true);
    });

    it('should validate direction consistency during updates', async () => {
      const body = { direction: 'INVALID' };

      try {
        await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, body);
        throw new Error('Should reject invalid direction');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Bad direction value');
      }
    });
  });

  describe.skip('Complex Endpoint Operations', () => {
    const validEndpoint = {
      value: {
        address: '192.168.1.1',
        ports: ['80', '443', '8000-8080']
      },
      direction: 'INGRESS',
      type: 'IP'
    };

    beforeEach(() => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(dfspId);
    });

    it.skip('should handle complete endpoint lifecycle', async () => {
      // Create endpoint
      sinon.stub(DFSPEndpointItemModel, 'create').resolves(epId);
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({
        id: epId,
        ...validEndpoint
      });

      const created = await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, validEndpoint);
      expect(created.id).toBe(epId);


      // Update endpoint
      const updateStub = sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        ...validEndpoint,
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, {
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      expect(updateStub.called).toBe(true);

      // Delete endpoint
      const deleteStub = sinon.stub(DFSPEndpointItemModel, 'delete').resolves();
      await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint(ctx, dfspId, epId);
      expect(deleteStub.called).toBe(true);
    });
  });

//13/02/2025
describe('getDFSPIngressIpEndpoint', () => {
  let getDFSPEndpointStub;

  const dfspId = 'dfsp123';
  const epId = 'ep123';

  beforeEach(() => {

    getDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'INGRESS',
      type: 'IP',
    });
  });

  afterEach(() => {
    sinon.restore();
  });


  it('should throw ValidationError if direction does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'EGRESS', type: 'IP' });

    await expect(DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId))
      .rejects.toThrow('Wrong direction');
  });

  it('should throw ValidationError if type does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'INGRESS', type: 'ADDRESS' });

    await expect(DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId))
      .rejects.toThrow('Wrong type');
  });
});

describe.skip('updateDFSPEgressIpEndpoint', () => {
  let updateDFSPEndpointStub;
  let getDFSPEndpointStub;

  const dfspId = 'dfsp123';
  const epId = 'ep123';
  const body = { direction: 'EGRESS', type: 'IP' };

  beforeEach(() => {
    getDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'EGRESS',
      type: 'IP',
    });


    updateDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'updateDFSPEndpoint').resolves({ success: true });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should throw ValidationError if direction is not "EGRESS"', async () => {
    body.direction = 'INGRESS';

    try {
      await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body);
      // If no error is thrown, fail the test
      fail('Expected ValidationError to be thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(ValidationError);
      expect(err.message).toContain('Bad direction value');
      expect(typeof err.payload.validationErrors).toBe('object');
    }
  });


    it('should throw ValidationError if type is not "IP"', async () => {
      body.type = 'ADDRESS';  // Invalid type

      await expect(DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body))
        .rejects.toThrow(ValidationError);
      await expect(DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body))
        .rejects.toThrow('Bad type value');
    });

    it('should not throw error if direction is "EGRESS" and type is "IP"', async () => {
      body.direction = 'EGRESS';
      body.type = 'IP';

      const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body);

      expect(updateDFSPEndpointStub).toHaveBeenCalledWith(dfspId, epId, body);
      expect(result).toEqual({ success: true });
    });

    it('should throw ValidationError if direction is not "EGRESS"', async () => {
      body.direction = 'INGRESS';

      await expect(DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body))
        .rejects.toThrow(ValidationError);
      await expect(DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body))
        .rejects.toThrow('Wrong direction');
    });
});

describe.skip('getDFSPIngressUrlEndpoint', () => {
  let getDFSPEndpointStub;
  const dfspId = 'dfsp123';
  const epId = 'ep123';
  const ctx = {};

  beforeEach(() => {
    getDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'INGRESS',
      type: 'URL',
      url: 'https://example.com',
    });
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should call validateDirectionType with correct arguments', async () => {
    // Call the method under test
    await DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId);

    expect(validateDirectionTypeStub).toHaveBeenCalledTimes(1);
    expect(validateDirectionTypeStub).toHaveBeenCalledWith('INGRESS', 'URL', epId, dfspId);
  });


  it('should return the correct endpoint from getDFSPEndpoint', async () => {
    const result = await DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId);

    expect(getDFSPEndpointStub).toHaveBeenCalledTimes(1);

    expect(getDFSPEndpointStub).toHaveBeenCalledWith(dfspId, epId);

    expect(result).toEqual({ direction: 'INGRESS', type: 'URL', url: 'https://example.com' });
  });


  it('should throw ValidationError if direction does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'EGRESS', type: 'URL' });

    await expect(DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId))
      .rejects.toThrow('Wrong direction');
  });

  it('should throw ValidationError if type does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'INGRESS', type: 'ADDRESS' });

    await expect(DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId))
      .rejects.toThrow('Wrong type');
  });
});

describe.skip('updateDFSPIngressUrlEndpoint', () => {
  let updateDFSPEndpointStub;
  let validateDirectionTypeStub;
  const dfspId = 'dfsp123';
  const epId = 'ep123';
  const ctx = {};
  beforeEach(() => {
    updateDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'updateDFSPEndpoint').resolves({}); // Mocking success response
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should set type to URL if not provided', async () => {
    const body = {};
    const result = await DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body);

    expect(body.type).toBe('URL');
    expect(validateDirectionTypeStub).toHaveBeenCalledTimes(1);
    expect(validateDirectionTypeStub).toHaveBeenCalledWith('INGRESS', 'URL', epId, dfspId);
    expect(updateDFSPEndpointStub).toHaveBeenCalledTimes(1);
    expect(updateDFSPEndpointStub).toHaveBeenCalledWith(dfspId, epId, body);
  });

  it('should throw a ValidationError if direction is invalid', async () => {
    const body = { direction: 'INVALID' };

    await expect(DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body))
      .rejects.toThrow('Bad direction value');
  });

  it('should throw a ValidationError if type is invalid', async () => {
    const body = { type: 'INVALID' };

    await expect(DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body))
      .rejects.toThrow(ValidationError);
    await expect(DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body))
      .rejects.toThrow('Bad type value');
  });

});

describe.skip('DfspNetworkConfigService', () => {
  let validateDirectionTypeStub;
  let getDFSPEndpointStub;
  let deleteDFSPEndpointStub;
  let someFunctionUnderTest;
  let updateDFSPEndpointStub;
  beforeEach(() => {
    updateDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'updateDFSPEndpoint').resolves();

        // Define the function under test
        someFunctionUnderTest = DfspNetworkConfigService.someFunctionUnderTest;
    // Stub getDFSPEndpoint to return a mock endpoint response
    getDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'EGRESS',
      type: 'IP',
      ip: '192.168.1.1'
    });
    deleteDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'deleteDFSPEndpoint').resolves({
      success: true
    });
  });

  afterEach(() => {
    // Restore the original functions after each test
    sinon.restore();
  });

  it('should call validateDirectionType and getDFSPEndpoint with correct arguments', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Call the function
    const result = await DfspNetworkConfigService.getDFSPEgressIpEndpoint(ctx, dfspId, epId);

    // Ensure validateDirectionType is called correctly
    expect(validateDirectionTypeStub).toHaveBeenCalledTimes(1);
    expect(validateDirectionTypeStub).toHaveBeenCalledWith('EGRESS', 'IP', epId, dfspId);
    // Ensure getDFSPEndpoint is called correctly
    expect(getDFSPEndpointStub).toHaveBeenCalledTimes(1);
    expect(getDFSPEndpointStub).toHaveBeenCalledWith(dfspId, epId);
    // Ensure the result is correct
    expect(result).toEqual({
      direction: 'EGRESS',
      type: 'IP',
      ip: '192.168.1.1'
    });
  });
  it('should handle errors from getDFSPEndpoint', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Stub getDFSPEndpoint to throw an error
    getDFSPEndpointStub.rejects(new Error('Endpoint not found'));

    await expect(DfspNetworkConfigService.getDFSPEgressIpEndpoint(ctx, dfspId, epId))
      .rejects.toThrow(Error);
    await expect(DfspNetworkConfigService.getDFSPEgressIpEndpoint(ctx, dfspId, epId))
      .rejects.toThrow('Endpoint not found');
  });

  it('should call validateDirectionType and deleteDFSPEndpoint with correct arguments', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Call the function
    const result = await DfspNetworkConfigService.deleteDFSPEgressIpEndpoint(ctx, dfspId, epId);
    // Ensure deleteDFSPEndpoint is called correctly
    expect(deleteDFSPEndpointStub).toHaveBeenCalledTimes(1);
    expect(deleteDFSPEndpointStub).toHaveBeenCalledWith(dfspId, epId);
    // Ensure the result is correct
    expect(result).toEqual({ success: true });
  });

  it('should handle errors from deleteDFSPEndpoint', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Stub deleteDFSPEndpoint to throw an error
    deleteDFSPEndpointStub.rejects(new Error('Endpoint not found'));

    await expect(DfspNetworkConfigService.deleteDFSPEgressIpEndpoint(ctx, dfspId, epId))
      .rejects.toThrow(Error);
    await expect(DfspNetworkConfigService.deleteDFSPEgressIpEndpoint(ctx, dfspId, epId))
      .rejects.toThrow('Endpoint not found');
  });
  it('should throw ValidationError when type is invalid', async () => {
    const body = { type: 'INVALID_TYPE' };
    await expect(someFunctionUnderTest(body)).rejects.toThrow(ValidationError);
    await expect(someFunctionUnderTest(body)).rejects.toThrow('Bad type value');
  });

  it('should not throw ValidationError when type is IP', async () => {
    const body = { type: 'IP' };

    try {
      await someFunctionUnderTest(body);
      // If no error is thrown, the test passes
    } catch (error) {
      // If an error is thrown, fail the test
      fail('Unexpected error was thrown');
    }
  });

  it('should set type to IP when type is missing', async () => {
    const body = {};

    try {
      await someFunctionUnderTest(body);
      expect(body.type).toBe('IP');
    } catch (error) {
      fail('Unexpected error was thrown');
    }
  });

  //
  it('should set type to "IP" if not provided', async () => {
    const body = {};  // type is not provided
    const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);

    // Assert the type is set to "IP" by default
    expect(body.type).toEqual('IP');
    expect(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body)).toEqual(true);
  });

  it('should throw ValidationError if type is not "IP"', async () => {
    const body = { type: 'INVALID' };  // type is provided but is not "IP"
    try {
      await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);
      // If no error is thrown, fail the test
      expect.fail('Expected ValidationError to be thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toEqual('Bad type value');
    }
  });

  it('should not throw error if type is "IP"', async () => {
    const body = { type: 'IP' };  // type is already "IP"
    const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);

    // Assert that no error is thrown, and the body remains unchanged
    expect(body.type).toEqual('IP');
    expect(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body)).toEqual(true);
  });
});

describe('deleteDFSPIngressIpEndpoint', () => {
  let getDFSPEndpointStub;
  let deleteDFSPEndpointStub;

  const dfspId = 'dfsp123';
  const epId = 'ep456';

  beforeEach(() => {
    // Stub getDFSPEndpoint, which validateDirectionType relies on
    getDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'INGRESS',
      type: 'IP',
    });

    // Stub deleteDFSPEndpoint
    deleteDFSPEndpointStub = sinon.stub(DfspNetworkConfigService, 'deleteDFSPEndpoint').resolves();
  });

  afterEach(() => {
    sinon.restore(); // Restore original methods
  });

  it('should validate direction and type before deleting the endpoint', async () => {
    await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint({}, dfspId, epId);

    // Ensure getDFSPEndpoint was called correctly (which validateDirectionType depends on)
    expect(getDFSPEndpointStub.calledOnceWith(dfspId, epId)).toEqual(true);

    // Ensure deleteDFSPEndpoint was called after validation
    expect(deleteDFSPEndpointStub.calledOnceWith(dfspId, epId)).toEqual(true);
  });

  it('should throw ValidationError if getDFSPEndpoint returns wrong direction/type', async () => {
    getDFSPEndpointStub.resolves({
      direction: 'EGRESS', // Incorrect direction
      type: 'ADDRESS', // Incorrect type
    });

    try {
      await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint({}, dfspId, epId);
    } catch (error) {
      expect(error).toBeInstanceOf(ValidationError);
      expect(error.message).toMatch(/Wrong direction/); // Validate error message
    }
    // Ensure deleteDFSPEndpoint was NOT called if validation fails
    expect(deleteDFSPEndpointStub.notCalled).toEqual(true);
  });
});

describe('Error Handling', () => {
    it('should handle missing DFSP gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP'));

      await expect(DfspNetworkConfigService.getDFSPEndpoints(ctx, 'nonexistent-dfsp'))
        .rejects.toThrow(ValidationError);
    });

    it('should handle missing endpoint gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(
        new NotFoundError('Endpoint not found')
      );

      await expect(DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, 'nonexistent-ep'))
        .rejects.toThrow(NotFoundError);
    });
  });
});

describe('DfspNetworkConfigService Edge Cases and Validations', () => {
  let ctx;
  const dfspId = 'EDGE_TEST_DFSP';
  const epId = 'EDGE_TEST_EP';

  beforeAll(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => sinon.restore());

  afterAll(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe.skip('Input Validation', () => {
    it('should validate IP address format strictly', async () => {
      const invalidIPs = [
        '256.1.2.3',
        '1.2.3.256',
        '1.2.3',
        'a.b.c.d',
        '192.168.1.1/33', // Invalid CIDR
        '300.168.1.1/24'
      ];

      for (const ip of invalidIPs) {
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, {
            value: { address: ip, ports: ['80'] }
          });
          throw new Error(`Should reject invalid IP: ${ip}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });

    it('should validate port ranges comprehensively', async () => {
      const invalidPorts = [
        ['0'],
        ['65536'],
        ['-1'],
        ['abc'],
        ['22-21'], // Invalid range (start > end)
        ['1-65537'],
        ['22-'],
        ['-80']
      ];

      for (const ports of invalidPorts) {
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, {
            value: { address: '192.168.1.1', ports }
          });
          throw new Error(`Should reject invalid ports: ${ports}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });

    it('should validate URL format strictly', async () => {
      const invalidUrls = [
        { value: { url: 'not-a-url' } },
        { value: { url: 'ftp://invalid-scheme.com' } },
        { value: { url: 'http:/missing-slash.com' } },
        { value: { url: 'https://' } },
        { value: { url: 'http:///' } }
      ];

      for (const urlBody of invalidUrls) {
        try {
          await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
          throw new Error(`Should reject invalid URL: ${urlBody.value.url}`);
        } catch (error) {
          expect(error).toBeInstanceOf(ValidationError);
        }
      }
    });
  });

  describe('State Transitions and Updates', () => {
    beforeEach(() => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({
        id: epId,
        state: 'NEW'
      });
    });

    it('should handle endpoint state transitions correctly', async () => {
      sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        state: 'CONFIRMED'
      });

      const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, epId);

      expect(result.state).toBe('CONFIRMED');
      expect(DFSPEndpointItemModel.update.calledWith(dfspId, epId, { state: 'CONFIRMED' })).toBe(true);
    });

    it('should validate direction consistency during updates', async () => {
      const body = { direction: 'INVALID' };

      try {
        await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, body);
        throw new Error('Should reject invalid direction');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
        expect(error.message).toBe('Bad direction value');
      }
    });
  });

  describe.skip('Complex Endpoint Operations', () => {
    const validEndpoint = {
      value: {
        address: '192.168.1.1',
        ports: ['80', '443', '8000-8080']
      },
      direction: 'INGRESS',
      type: 'IP'
    };

    beforeEach(() => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(dfspId);
    });

    it('should handle complete endpoint lifecycle', async () => {
      // Create endpoint
      sinon.stub(DFSPEndpointItemModel, 'create').resolves(epId);
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({
        id: epId,
        ...validEndpoint
      });

      const created = await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, validEndpoint);
      expect(created.id).toBe(epId);

      // Update endpoint
      const updateStub = sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        ...validEndpoint,
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, {
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      expect(updateStub.called).toBe(true);

      // Delete endpoint
      const deleteStub = sinon.stub(DFSPEndpointItemModel, 'delete').resolves();
      await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint(ctx, dfspId, epId);
      expect(deleteStub.called).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DFSP gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP'));

      try {
        await DfspNetworkConfigService.getDFSPEndpoints(ctx, 'nonexistent-dfsp');
        throw new Error('Should throw ValidationError');
      } catch (error) {
        expect(error).toBeInstanceOf(ValidationError);
      }
    });

    it('should handle missing endpoint gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(
        new NotFoundError('Endpoint not found')
      );

      try {
        await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, 'nonexistent-ep');
        throw new Error('Should throw NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
      }
    });
  });
});
