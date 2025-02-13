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
const { assert } = require('chai');
const { expect } = require('chai');
const { setupTestDB, tearDownTestDB } = require('./test-database');
const PkiService = require('../../src/service/PkiService');
const DfspNetworkConfigService = require('../../src/service/DfspNetworkConfigService');
const ValidationError = require('../../src/errors/ValidationError');
const NotFoundError = require('../../src/errors/NotFoundError');
const { createContext, destroyContext } = require('./context');
const { StatusEnum } = require('../../src/service/DfspNetworkConfigService');
const DFSPEndpointModel = require('../../src/models/DFSPEndpointModel');
const DFSPModel = require('../../src/models/DFSPModel');
const DFSPEndpointItemModel = require('../../src/models/DFSPEndpointItemModel');
const { getDFSPIngressIpEndpoint } = require('../../src/service/DfspNetworkConfigService');  // Replace with actual service path

const { validateDirectionType } = require('../../src/service/DfspNetworkConfigService');

describe('DfspNetworkConfigService Unit Tests', () => {
  let ctx;
  const dfspId = 'DFSP_TEST_1';
  const endpointId = 'ENDPOINT_TEST_1';

  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });
  beforeEach(() => sinon.restore());  

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });
  
  // Test getDfspStatus
  describe('getDfspStatus', () => {
    it('should return default status when DFSP exists', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').resolves({ id: dfspId, name: 'DFSP Test' });
      sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([]);

      const result = await DfspNetworkConfigService.getDfspStatus(ctx, dfspId);
      assert.isArray(result);
      assert.equal(result[0].phase, 'BUSINESS_SETUP');
      assert.equal(result[1].phase, 'TECHNICAL_SETUP');
    });

    it('should throw NotFoundError when DFSP does not exist', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').throws(new NotFoundError('DFSP not found'));

      try {
        await DfspNetworkConfigService.getDfspStatus(ctx, dfspId);
        assert.fail('Expected NotFoundError');
      } catch (error) {
        assert(error instanceof NotFoundError);
      }
    });
  });

  // Test createDFSPEgress
  describe('createDFSPEgress', () => {
    it('should create DFSP egress endpoint successfully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'create').resolves(endpointId);
      sinon.stub(DFSPEndpointModel, 'findById').resolves({ dfspId, state: 'NOT_STARTED' });

      const result = await DfspNetworkConfigService.createDFSPEgress(ctx, dfspId, { data: 'test' });
      assert.equal(result.dfspId, dfspId);
    });

    it('should throw ValidationError for invalid DFSP ID', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP ID'));

      try {
        await DfspNetworkConfigService.createDFSPEgress(ctx, 'INVALID_DFSP', {});
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert(error instanceof ValidationError);
      }
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
      assert.equal(result.id, endpointId);
    });


    it('should throw ValidationError for missing address', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
    
      const body = { value: { ports: ['80'] } };
    
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
        assert.equal(error.message, 'No address received');
      }
    }); 
 

    it('should throw ValidationError for missing ports', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();     
      const body = { value: { address: '1.1.1.1' } };   
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
        assert.equal(error.message, 'No ports received');
      }
    });
    
    it('should throw ValidationError when creating DFSP Ingress with empty body', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves(); // Prevent NotFoundError
    
      const emptyBody = { value: {} }; // Ensure the structure exists
    
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, emptyBody);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    });

    it('should update existing DFSP Ingress config', async () => {
      sinon.restore(); // Ensures no existing stubs interfere

      const stub = sinon.stub(DfspNetworkConfigService, 'createDFSPIngress');
      stub.onFirstCall().resolves({ dfspId, url: 'http://original.com' });
      stub.onSecondCall().resolves({ dfspId, url: 'http://updated.com', state: StatusEnum.NOT_STARTED });

      const original = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, { url: 'http://original.com' });
      const updated = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, { url: 'http://updated.com' });

      assert.equal(updated.url, 'http://updated.com');
      assert.notEqual(updated.url, original.url);
      assert.equal(updated.state, StatusEnum.NOT_STARTED);
    });
  
    it('should maintain consistent state between create and get operations', async () => {
      const body = { url: 'http://test.com' };
  
      sinon.stub(DfspNetworkConfigService, 'createDFSPIngress').resolves({ dfspId, url: body.url, state: StatusEnum.NOT_STARTED });
      sinon.stub(DfspNetworkConfigService, 'getDFSPIngress').resolves({ dfspId, url: body.url, state: StatusEnum.NOT_STARTED });
  
      const created = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, body);
      const retrieved = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
  
      assert.deepEqual(created, retrieved);
      assert.equal(created.dfspId, retrieved.dfspId);
      assert.equal(created.url, retrieved.url);
      assert.equal(created.state, retrieved.state);
    });

    it('should throw NotFoundError when getting non-existent DFSP Ingress', async () => {
      sinon.stub(DfspNetworkConfigService, 'getDFSPIngress').throws(new NotFoundError('DFSP Ingress not found'));
    
      try {
        await DfspNetworkConfigService.getDFSPIngress(ctx, 'NONEXISTENT_DFSP');
        assert.fail('Expected NotFoundError'); // Fails the test if error is not thrown
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
        assert.equal(error.message, 'DFSP Ingress not found');
      }
    });
  });

  // Test getDFSPEgress
  describe('getDFSPEgress', () => {
    it('should return DFSP Egress configuration', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'findLastestByDirection').resolves({ dfspId, state: 'NOT_STARTED' });

      const result = await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
      assert.equal(result.dfspId, dfspId);
    });

    it('should throw NotFoundError when no egress config exists', async () => {
      try {
        await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
        assert.fail('Expected NotFoundError');
      } catch (error) {
        assert(error instanceof NotFoundError);
      }
    });
  });

  // Test deleteDFSPEndpoint
  describe('deleteDFSPEndpoint', () => {
    it('should delete a DFSP endpoint successfully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });
      sinon.stub(DFSPEndpointItemModel, 'delete').resolves();

      await DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId);
      assert.ok(true); // No error means test passes
    });

    it('should throw NotFoundError when endpoint does not exist', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(new NotFoundError('Endpoint not found'));

      try {
        await DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId);
        assert.fail('Expected NotFoundError');
      } catch (error) {
        assert(error instanceof NotFoundError);
      }
    });
  });

  // Test confirmEndpointItem
  describe('confirmEndpointItem', () => {
    it('should confirm an endpoint item successfully', async () => {
      sinon.stub(DFSPEndpointItemModel, 'update').resolves({ id: endpointId, state: 'CONFIRMED' });

      const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, endpointId);
      assert.equal(result.state, 'CONFIRMED');
    });
  });
});

describe('DfspNetworkConfigService', () => {
  let ctx;
  const dfspId = 'DFSP_TEST_1';
  const epId = 'EP_TEST_1';

  before(async () => {
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

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  it('should return unprocessed DFSP items when DFSP is valid', async () => {
    const result = await DfspNetworkConfigService.getUnprocessedDfspItems(ctx, dfspId);
    assert.isArray(result, 'Result should be an array');
    assert.lengthOf(result, 2, 'Should return two unprocessed DFSP items');
    assert.deepStrictEqual(result, [
      { id: 'item1', state: 'NEW' },
      { id: 'item2', state: 'NEW' }
    ]);
  });

  it('should return DFSP endpoints when DFSP is valid', async () => {
    const result = await DfspNetworkConfigService.getDFSPEndpoints(ctx, dfspId);
    assert.isArray(result, 'Result should be an array');
    assert.lengthOf(result, 2, 'Should return two endpoints');
    assert.deepStrictEqual(result, [
      { id: 'endpoint1' },
      { id: 'endpoint2' }
    ]);
  });
});

describe('validateDirectionType Tests', () => {
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

    try {
      await validateDirectionType('EGRESS', 'IP', epId, dfspId);
    } catch (error) {
      assert.fail(`Unexpected error thrown: ${error.message}`);
    }

    sinon.assert.calledOnce(DfspNetworkConfigService.getDFSPEndpoint);
  });

  it('should throw ValidationError when direction is incorrect', async () => {
    sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'INGRESS',
      type: 'IP',
    });

    try {
      await validateDirectionType('EGRESS', 'IP', epId, dfspId);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert.instanceOf(error, ValidationError);
      assert.equal(error.message, 'Wrong direction EGRESS, endpoint has already INGRESS');
    }
  });

  it('should throw ValidationError when type is incorrect', async () => {
    sinon.stub(DfspNetworkConfigService, 'getDFSPEndpoint').resolves({
      direction: 'EGRESS',
      type: 'URL',
    });

    try {
      await validateDirectionType('EGRESS', 'IP', epId, dfspId);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert.instanceOf(error, ValidationError);
      assert.equal(error.message, 'Wrong type IP, endpoint has already URL');
    }
  });

  afterEach(() => {
    sinon.restore();
  });
});

describe('DfspNetworkConfigService creating endpoint items', () => {
  let dfspId = null;
  let ctx;
  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });
  beforeEach('creating hook DFSP', async () => {
    const dfsp = {
      dfspId: 'DFSP_TEST_B',
      name: 'DFSP_TEST_B_description'
    };
    const resultDfsp = await PkiService.createDFSP(ctx, dfsp);
    dfspId = resultDfsp.id;
  });

  afterEach('tearing down hook DFSP', async () => {
    await PkiService.deleteDFSP(ctx, dfspId);
  });

  describe('DfspNetworkConfigService validations', () => {
    it('should throw an error when direction type is incorrect', async () => {
      try {
        await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, 'DFSP_ID', 'EP_ID', { direction: 'WRONG' });
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
        assert.equal(error.message, 'Bad direction value');
      }
    });
    it('should throw ValidationError on illegal Egress IP', async () => {
      const illegalIPBody = { value: { address: '999.1.1.1', ports: ['80'] } };
      try {
        await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Ingress IP', async () => {
      const illegalIPBody = { value: { address: '999.1.1.1', ports: ['80'] } };
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Egress IP', async () => {
      const illegalIPBody = { value: { address: 'a.b.c.d', ports: ['80'] } };
      try {
        await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Ingress IP', async () => {
      const illegalIPBody = { value: { address: 'a.b.c.d', ports: ['80'] } };
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Ingress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['-80'] } };
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Ingress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['80', '90000-'] } };
      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Egress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['-80'] } };
      try {
        await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal Egress ports', async () => {
      const illegalIPBody = { value: { address: '1.1.1.1', ports: ['80', '90000-'] } };
      try {
        await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, illegalIPBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError, 'Error is: ' + error);
      }
    });

    it('should throw ValidationError on illegal URL', async () => {
      let illegalUrlBody = { value: { url: 'ftp:www.sun.com' } };

      try {
        await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, illegalUrlBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError);
      }

      illegalUrlBody = { value: { url: 'www.sun.com' } };

      try {
        await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, illegalUrlBody);
        assert.fail();
      } catch (error) {
        assert(error instanceof ValidationError);
      }
    });
  });

  it('should create an ingress IP endpoint', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    const result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    assert.equal(result[0].value.address, ipBody.value.address);
    assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
    assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);
  });

  it('should create more than one input IP entry', async () => {
    let ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    let result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    assert.equal(result.length, 1);
    assert.equal(result[0].value.address, ipBody.value.address);
    assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
    assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);

    ipBody = { value: { address: '2.2.2.2', ports: ['80'] } };
    await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, ipBody);
    result = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    assert.equal(result.length, 2);
    assert.equal(result[1].value.address, ipBody.value.address);
    assert.equal(result[1].value.ports[0], ipBody.value.ports[0]);

    const items = await DfspNetworkConfigService.getDFSPIngressIps(ctx, dfspId);
    assert.equal(items.length, 2);
  });

  it('should create an egress IP endpoint', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    const result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    assert.equal(result[0].value.address, ipBody.value.address);
    assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
    assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);
  });

  it('should create more than one egress IP entry', async () => {
    let ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    let result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    assert.equal(result.length, 1);
    assert.equal(result[0].value.address, ipBody.value.address);
    assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
    assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);

    ipBody = { value: { address: '2.2.2.2', ports: ['80'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    assert.equal(result.length, 2);
    assert.equal(result[1].value.address, ipBody.value.address);
    assert.equal(result[1].value.ports[0], ipBody.value.ports[0]);

    const items = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
    assert.equal(items.length, 2);
  });

  it('should create an IngressUrl', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    assert.equal(items.length, 1);
  });

  it('should create more than one ingress URL entry', async () => {
    const COUNT = 10;
    for (let index = 0; index < COUNT; index++) {
      const urlBody = { value: { url: `http://www.sun${index}.com` } };
      await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    }
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    assert.equal(items.length, COUNT);
  });

  it('should update a set of endpoints', async () => {
    let urlBody = { value: { url: 'http://www.sun.com' } };
  
    // Step 1: Create the initial URL
    const created = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    assert.equal(created.value.url, 'http://www.sun.com');
  
    // Step 2: Update the same endpoint using its ID
    urlBody = { value: { url: 'http://www.oracle.com' } };
    await DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, created.id, urlBody);
  
    // Step 3: Retrieve and check if the update was successful
    const updated = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    assert.equal(updated[0].value.url, 'http://www.oracle.com');
  });  
  

  it('should not throw NotFoundError when no IngressUrl endpoint configured', async () => {
    const items = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
    assert.equal(items.length, 0);
  });

  it('should return the correct amount of unprocessed endpoints for URLs', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    assert.equal(items.length, 1);
  });

  it('should return the correct format for of unprocessed endpoints for URLs', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    assert.equal(items.length, 1);
    assert.equal(items[0].value.url, urlBody.value.url);
  });

  it('should return the correct format for of unprocessed endpoints for IPs', async () => {
    const ipBody = { value: { address: '1.1.1.1', ports: ['80', '8000-8080'] } };
    await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, ipBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    assert.equal(items.length, 1);
    assert.equal(items[0].value.address, ipBody.value.address);
  });

  it('should confirm an ingress URL endpoint', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    const result = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);

    const confirmed = await DfspNetworkConfigService.confirmEndpointItem(ctx, result.dfsp_id, result.id);
    assert.equal(confirmed.state, 'CONFIRMED');
  });

  it('should create update delete an ingress URL via endpoint operations', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    const result = await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const loadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id);
    assert.equal(loadedUrl.value.url, urlBody.value.url);
    loadedUrl.value.url = 'http://www.oracle.com';
    const updatedUrl = await DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, result.id, loadedUrl);
    assert.equal(updatedUrl.value.url, loadedUrl.value.url);
    const newLoadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id);
    assert.equal(newLoadedUrl.value.url, loadedUrl.value.url);
    const emptyResponse = await DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, result.id);
    assert.isUndefined(emptyResponse);
    try {
      await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, result.id);
      assert.fail('Should not have got here');
    } catch (error) {
      assert(error instanceof NotFoundError, 'Error is: ' + error);
    }
  });

  it('should return the dfspId as string when getting the UnprocessedEndpointItems', async () => {
    const urlBody = { value: { url: 'http://www.sun.com' } };
    await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
    assert.equal(items.length, 1);
    assert.equal(items[0].dfsp_id, 'DFSP_TEST_B', JSON.stringify(items, null, 2));
  });

  it('should return a NotFound exception when Endpoint Egress config doesnt exist', async () => {
    try {
      await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
      assert.fail('NotFoundError should have been thrown');
    } catch (error) {
      assert(error instanceof NotFoundError, 'Error is: ' + error);
    }
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
    assert.equal(createDFSPEgressResult.dfspId, dfspId);
    assert.equal(getDFSPEgressResult.dfspId, dfspId);
    assert.equal(createDFSPEgressResult.state, StatusEnum.NOT_STARTED);
    assert.equal(getDFSPEgressResult.state, StatusEnum.NOT_STARTED);
    assert.deepEqual(createDFSPEgressResult.ipList, body.ipList);
    assert.deepEqual(getDFSPEgressResult.ipList, body.ipList);
    assert.notProperty(createDFSPEgressResult, 'direction');
    assert.notProperty(getDFSPEgressResult, 'direction');
    assert.beforeOrEqualDate(new Date(createDFSPEgressResult.createdAt), new Date());
    assert.beforeOrEqualDate(new Date(getDFSPEgressResult.createdAt), new Date());
  });

  it('should return a NotFound exception when Endpoint Ingress config doesnt exist', async () => {
    try {
      await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
      assert.fail('NotFoundError should have been thrown');
    } catch (error) {
      assert(error instanceof NotFoundError, 'Error is: ' + error);
    }
  });

  it('should throw NotFoundError when DFSP status is not found', async () => {
    sinon.stub(DFSPModel, 'findByDfspId').throws(new NotFoundError('DFSP not found'));
  
    try {
      await DfspNetworkConfigService.getDfspStatus(ctx, 'INVALID_DFSP');
      assert.fail('Expected NotFoundError');
    } catch (error) {
      assert(error instanceof NotFoundError);
      assert.equal(error.message, 'Status for environment: dfsp: INVALID_DFSP not found');
    }
  
    DFSPModel.findByDfspId.restore();
  });
  
  it('should throw ValidationError when creating DFSP Ingress IP with missing ports', async () => {
    const invalidBody = { value: { address: '1.1.1.1' } };
  
    try {
      await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, invalidBody);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert(error instanceof ValidationError);
      assert.equal(error.message, 'No ports received');
    }
  });
  it('should throw ValidationError if ports is not an array', async () => {
    const invalidBody = { value: { address: '1.1.1.1', ports: '80' } }; // String instead of array
  
    try {
      await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert.instanceOf(error, ValidationError);
      assert.equal(error.message, 'Ports must be an array');
    }
  });
  
  it('should throw ValidationError when creating DFSP Egress IP with invalid IP format', async () => {
    const invalidBody = { value: { address: '999.999.999.999', ports: ['80'] } };
  
    try {
      await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert.instanceOf(error, ValidationError);
      assert.include(error.message, 'Invalid IP address or CIDR range'); // Updated message
    }
  });
  
  
  it('should throw ValidationError when updating DFSP endpoint with invalid URL', async () => {
    const endpointId = 'some-endpoint-id';
    const invalidBody = { value: { url: 'invalid-url' } };
  
    sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });
  
    try {
      await DfspNetworkConfigService.updateDFSPEndpoint(ctx, dfspId, endpointId, invalidBody);
      assert.fail('Expected ValidationError');
    } catch (error) {
      assert(error instanceof ValidationError);
      assert.include(error.message, 'Invalid URL');
    }
  
    DFSPEndpointItemModel.findObjectById.restore();
  });    
  it('should throw NotFoundError when deleting non-existent DFSP endpoint', async () => {
    const endpointId = 'non-existent-id';
  
    sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(new NotFoundError('Endpoint not found'));
  
    try {
      await DfspNetworkConfigService.deleteDFSPEndpoint(ctx, dfspId, endpointId);
      assert.fail('Expected NotFoundError');
    } catch (error) {
      assert(error instanceof NotFoundError);
      assert.equal(error.message, 'Endpoint not found');
    }
  
    DFSPEndpointItemModel.findObjectById.restore();
  });
  it('should return an array of unprocessed endpoint items', async () => {
    const mockData = [{ id: '1', value: { url: 'http://test.com' } }];
    sinon.stub(DFSPEndpointItemModel, 'findAllEnvState').resolves(mockData);
  
    const items = await DfspNetworkConfigService.getUnprocessedEndpointItems(ctx);
  
    assert.isArray(items);
    assert.equal(items.length, 1);
    assert.equal(items[0].value.url, 'http://test.com');
  
    DFSPEndpointItemModel.findAllEnvState.restore();
  });
  it('should confirm an endpoint item successfully', async () => {
    const endpointId = 'endpoint-id';
  
    sinon.stub(DFSPEndpointItemModel, 'update').resolves({ id: endpointId, state: 'CONFIRMED' });
  
    const result = await DfspNetworkConfigService.confirmEndpointItem(ctx, dfspId, endpointId);
  
    assert.equal(result.state, 'CONFIRMED');
  
    DFSPEndpointItemModel.update.restore();
  });
  it('should return an empty array when no DFSP Egress IPs exist', async () => {
    sinon.stub(DFSPEndpointItemModel, 'findObjectByDirectionType').resolves([]);
  
    const result = await DfspNetworkConfigService.getDFSPEgressIps(ctx, dfspId);
  
    assert.isArray(result);
    assert.isEmpty(result);
  
    DFSPEndpointItemModel.findObjectByDirectionType.restore();
  });
              
  it('should create an Endpoint Ingress config', async () => {
    const body = {
      url: 'string'
    };

    const createDFSPIngressResult = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, body);
    const getDFSPIngressResult = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
    assert.equal(createDFSPIngressResult.dfspId, dfspId);
    assert.equal(getDFSPIngressResult.dfspId, dfspId);
    assert.equal(createDFSPIngressResult.state, StatusEnum.NOT_STARTED);
    assert.equal(getDFSPIngressResult.state, StatusEnum.NOT_STARTED);
    assert.deepEqual(createDFSPIngressResult.url, body.url);
    assert.deepEqual(getDFSPIngressResult.url, body.url);
    assert.notProperty(createDFSPIngressResult, 'direction');
    assert.notProperty(getDFSPIngressResult, 'direction');
    assert.beforeOrEqualDate(new Date(createDFSPIngressResult.createdAt), new Date());
    assert.beforeOrEqualDate(new Date(getDFSPIngressResult.createdAt), new Date());
  });
});

describe('DfspNetworkConfigService Edge Cases and Validations', () => {
  let ctx;
  const dfspId = 'EDGE_TEST_DFSP';
  const epId = 'EDGE_TEST_EP';

  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => sinon.restore());

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('Input Validation', () => {
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
          assert.fail(`Should reject invalid IP: ${ip}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
          assert.fail(`Should reject invalid ports: ${ports}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
          assert.fail(`Should reject invalid URL: ${urlBody.value.url}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
      
      assert.equal(result.state, 'CONFIRMED');
      assert.isTrue(DFSPEndpointItemModel.update.calledWith(dfspId, epId, { state: 'CONFIRMED' }));
    });

    it('should validate direction consistency during updates', async () => {
      const body = { direction: 'INVALID' };
      
      try {
        await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, body);
        assert.fail('Should reject invalid direction');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
        assert.equal(error.message, 'Bad direction value');
      }
    });
  });

  describe('Complex Endpoint Operations', () => {
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
      assert.equal(created.id, epId);

      // Update endpoint
      const updateStub = sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        ...validEndpoint,
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, {
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      assert.isTrue(updateStub.called);

      // Delete endpoint
      const deleteStub = sinon.stub(DFSPEndpointItemModel, 'delete').resolves();
      await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint(ctx, dfspId, epId);
      assert.isTrue(deleteStub.called);
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

    try {
      await DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Wrong direction', 'Error message should mention wrong direction');
    }
  });

  it('should throw ValidationError if type does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'INGRESS', type: 'ADDRESS' });

   
    try {
      await DfspNetworkConfigService.getDFSPIngressIpEndpoint(dfspId, epId);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Wrong type', 'Error message should mention wrong type');
    }
  });
});

describe('updateDFSPEgressIpEndpoint', () => {
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
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      
      assert.include(err.message, 'Bad direction value', 'Error message should mention bad direction');
  
      assert.isObject(err.payload.validationErrors, 'Validation errors should be in the payload');
    }
  });
  

  it('should throw ValidationError if type is not "IP"', async () => {
    body.type = 'ADDRESS';  // Invalid type
    
    try {
      await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Bad type value', 'Error message should mention bad type');
    }
  });

  it('should not throw error if direction is "EGRESS" and type is "IP"', async () => {
    body.direction = 'EGRESS';  
    body.type = 'IP'; 

    const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body);
    
    assert.isTrue(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body), 'updateDFSPEndpoint should be called with correct parameters');
    assert.deepEqual(result, { success: true }, 'Returned result should match the mock data');
  });

  it('should throw ValidationError if direction is not "EGRESS"', async () => {
    body.direction = 'INGRESS';  

    try {
      await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(null, dfspId, epId, body);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Wrong direction', 'Error message should mention wrong direction');
    }
  });
});

describe('getDFSPIngressUrlEndpoint', () => {
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

    assert.isTrue(
      validateDirectionTypeStub.calledOnceWith('INGRESS', 'URL', epId, dfspId),
      'validateDirectionType should be called with the correct parameters'
    );
  });


  it('should return the correct endpoint from getDFSPEndpoint', async () => {
    const result = await DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId);

    assert.isTrue(
      getDFSPEndpointStub.calledOnce,
      'getDFSPEndpoint should be called once'
    );
    
    assert.isTrue(
      getDFSPEndpointStub.calledWith(dfspId, epId),
      `getDFSPEndpoint should be called with ${dfspId} and ${epId}`
    );

    assert.deepEqual(
      result,
      { direction: 'INGRESS', type: 'URL', url: 'https://example.com' },
      'The returned endpoint should match the mock response from getDFSPEndpoint'
    );
  });
  

  it('should throw ValidationError if direction does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'EGRESS', type: 'URL' });

    try {
      await DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Wrong direction', 'Error message should mention wrong direction');
    }
  });

  it('should throw ValidationError if type does not match', async () => {
    getDFSPEndpointStub.resolves({ direction: 'INGRESS', type: 'ADDRESS' });

    try {
      await DfspNetworkConfigService.getDFSPIngressUrlEndpoint(ctx, dfspId, epId);
      assert.fail('Expected ValidationError to be thrown');
    } catch (err) {
      assert.instanceOf(err, ValidationError, 'Expected a ValidationError');
      assert.include(err.message, 'Wrong type', 'Error message should mention wrong type');
    }
  });
});

describe('updateDFSPIngressUrlEndpoint', () => {
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

    assert.equal(body.type, 'URL', 'Type should default to URL');
    assert.isTrue(validateDirectionTypeStub.calledOnceWith('INGRESS', 'URL', epId, dfspId));
    assert.isTrue(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body));
  });

  it('should throw a ValidationError if direction is invalid', async () => {
    const body = { direction: 'INVALID' };

    try {
      await DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body);
      assert.fail('Expected ValidationError not thrown');
    } catch (error) {
      assert.instanceOf(error, ValidationError, 'Expected error to be a ValidationError');
      assert.equal(error.message, 'Bad direction value', 'Error message should match');
    }
  });

  it('should throw a ValidationError if type is invalid', async () => {
    const body = { type: 'INVALID' };

    try {
      await DfspNetworkConfigService.updateDFSPIngressUrlEndpoint(ctx, dfspId, epId, body);
      assert.fail('Expected ValidationError not thrown');
    } catch (error) {
      assert.instanceOf(error, ValidationError, 'Expected error to be a ValidationError');
      assert.equal(error.message, 'Bad type value', 'Error message should match');
    }
  });

});

describe('DfspNetworkConfigService', () => {
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
    assert.isTrue(validateDirectionTypeStub.calledOnceWith('EGRESS', 'IP', epId, dfspId));
    // Ensure getDFSPEndpoint is called correctly
    assert.isTrue(getDFSPEndpointStub.calledOnceWith(dfspId, epId));
    // Ensure the result is correct
    assert.deepEqual(result, {
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

    try {
      await DfspNetworkConfigService.getDFSPEgressIpEndpoint(ctx, dfspId, epId);
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Endpoint not found');
    }
  });

  it('should call validateDirectionType and deleteDFSPEndpoint with correct arguments', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Call the function
    const result = await DfspNetworkConfigService.deleteDFSPEgressIpEndpoint(ctx, dfspId, epId);
    // Ensure deleteDFSPEndpoint is called correctly
    assert.isTrue(deleteDFSPEndpointStub.calledOnceWith(dfspId, epId));
    // Ensure the result is correct
    assert.deepEqual(result, { success: true });
  });

  it('should handle errors from deleteDFSPEndpoint', async () => {
    const ctx = {};
    const dfspId = 'dfspId';
    const epId = 'epId';

    // Stub deleteDFSPEndpoint to throw an error
    deleteDFSPEndpointStub.rejects(new Error('Endpoint not found'));

    try {
      await DfspNetworkConfigService.deleteDFSPEgressIpEndpoint(ctx, dfspId, epId);
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.instanceOf(error, Error);
      assert.equal(error.message, 'Endpoint not found');
    }
  });
  it('should throw ValidationError when type is invalid', async () => {
    const body = { type: 'INVALID_TYPE' };

    try {
      await someFunctionUnderTest(body);
      assert.fail('Expected error was not thrown');
    } catch (error) {
      assert.instanceOf(error, ValidationError);
      assert.strictEqual(error.message, 'Bad type value');
    }
  });

  it('should not throw ValidationError when type is IP', async () => {
    const body = { type: 'IP' };

    try {
      await someFunctionUnderTest(body);
      // If no error is thrown, the test passes
    } catch (error) {
      assert.fail('Unexpected error was thrown');
    }
  });

  it('should set type to IP when type is missing', async () => {
    const body = {};

    try {
      await someFunctionUnderTest(body);
      assert.strictEqual(body.type, 'IP');
    } catch (error) {
      assert.fail('Unexpected error was thrown');
    }
  });

  //
  it('should set type to "IP" if not provided', async () => {
    const body = {};  // type is not provided
    const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);

    // Assert the type is set to "IP" by default
    expect(body.type).to.equal('IP');
    expect(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body)).to.be.true;
  });

  it('should throw ValidationError if type is not "IP"', async () => {
    const body = { type: 'INVALID' };  // type is provided but is not "IP"
    try {
      await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);
      // If no error is thrown, fail the test
      expect.fail('Expected ValidationError to be thrown');
    } catch (error) {
      expect(error).to.be.instanceOf(ValidationError);
      expect(error.message).to.equal('Bad type value');
    }
  });
 
  it('should not throw error if type is "IP"', async () => {
    const body = { type: 'IP' };  // type is already "IP"
    const result = await DfspNetworkConfigService.updateDFSPEgressIpEndpoint(ctx, dfspId, epId, body);

    // Assert that no error is thrown, and the body remains unchanged
    expect(body.type).to.equal('IP');
    expect(updateDFSPEndpointStub.calledOnceWith(dfspId, epId, body)).to.be.true;
  });
});

//.........................//


  describe('Error Handling', () => {
    it('should handle missing DFSP gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP'));

      try {
        await DfspNetworkConfigService.getDFSPEndpoints(ctx, 'nonexistent-dfsp');
        assert.fail('Should throw ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    });

    it('should handle missing endpoint gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(
        new NotFoundError('Endpoint not found')
      );

      try {
        await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, 'nonexistent-ep');
        assert.fail('Should throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    });
  });
});

describe('DfspNetworkConfigService Edge Cases and Validations', () => {
  let ctx;
  const dfspId = 'EDGE_TEST_DFSP';
  const epId = 'EDGE_TEST_EP';

  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => sinon.restore());

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('Input Validation', () => {
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
          assert.fail(`Should reject invalid IP: ${ip}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
          assert.fail(`Should reject invalid ports: ${ports}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
          assert.fail(`Should reject invalid URL: ${urlBody.value.url}`);
        } catch (error) {
          assert.instanceOf(error, ValidationError);
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
      
      assert.equal(result.state, 'CONFIRMED');
      assert.isTrue(DFSPEndpointItemModel.update.calledWith(dfspId, epId, { state: 'CONFIRMED' }));
    });

    it('should validate direction consistency during updates', async () => {
      const body = { direction: 'INVALID' };
      
      try {
        await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, body);
        assert.fail('Should reject invalid direction');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
        assert.equal(error.message, 'Bad direction value');
      }
    });
  });

  describe('Complex Endpoint Operations', () => {
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
      assert.equal(created.id, epId);

      // Update endpoint
      const updateStub = sinon.stub(DFSPEndpointItemModel, 'update').resolves({
        id: epId,
        ...validEndpoint,
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      await DfspNetworkConfigService.updateDFSPIngressIpEndpoint(ctx, dfspId, epId, {
        value: { address: '192.168.1.2', ports: ['8080'] }
      });

      assert.isTrue(updateStub.called);

      // Delete endpoint
      const deleteStub = sinon.stub(DFSPEndpointItemModel, 'delete').resolves();
      await DfspNetworkConfigService.deleteDFSPIngressIpEndpoint(ctx, dfspId, epId);
      assert.isTrue(deleteStub.called);
    });
  });

  describe('Error Handling', () => {
    it('should handle missing DFSP gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').throws(new ValidationError('Invalid DFSP'));

      try {
        await DfspNetworkConfigService.getDFSPEndpoints(ctx, 'nonexistent-dfsp');
        assert.fail('Should throw ValidationError');
      } catch (error) {
        assert.instanceOf(error, ValidationError);
      }
    });

    it('should handle missing endpoint gracefully', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').throws(
        new NotFoundError('Endpoint not found')
      );

      try {
        await DfspNetworkConfigService.getDFSPEndpoint(ctx, dfspId, 'nonexistent-ep');
        assert.fail('Should throw NotFoundError');
      } catch (error) {
        assert.instanceOf(error, NotFoundError);
      }
    });
  });  
});