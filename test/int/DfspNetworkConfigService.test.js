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

const PkiService = require('../../src/service/PkiService');
const DfspNetworkConfigService = require('../../src/service/DfspNetworkConfigService');
const ValidationError = require('../../src/errors/ValidationError');
const NotFoundError = require('../../src/errors/NotFoundError');
const { assert } = require('chai').use(require('chai-datetime'));
const { createContext, destroyContext } = require('./context');
const { StatusEnum } = require('../../src/service/DfspNetworkConfigService');
const sinon = require('sinon');
const DFSPEndpointModel = require('../../src/models/DFSPEndpointModel');
const DFSPModel = require('../../src/models/DFSPModel');
const DFSPEndpointItemModel = require('../../src/models/DFSPEndpointItemModel');

describe('DfspNetworkConfigService Unit Tests', () => {
  let ctx;
  const dfspId = 'DFSP_TEST_1';
  const endpointId = 'ENDPOINT_TEST_1';

  beforeEach(async() => {
    ctx = await createContext();
    await setupTestDB(); // Mock context
  });

  afterEach(() => {
    sinon.restore();
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
    it('should create a DFSP Ingress IP entry', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'create').resolves(endpointId);
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').resolves({ id: endpointId });

      const body = { value: { address: '1.1.1.1', ports: ['80'] } };
      const result = await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
      assert.equal(result.id, endpointId);
    });

    it('should throw ValidationError for missing address', async () => {
      const body = { value: { ports: ['80'] } };

      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert(error instanceof ValidationError);
        assert.equal(error.message, 'No address received');
      }
    });

    it('should throw ValidationError for missing ports', async () => {
      const body = { value: { address: '1.1.1.1' } };

      try {
        await DfspNetworkConfigService.createDFSPIngressIp(ctx, dfspId, body);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert(error instanceof ValidationError);
        assert.equal(error.message, 'No ports received');
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
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'findLastestByDirection').resolves(null);

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

  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  beforeEach(() => {
    sinon.stub(PkiService, 'validateDfsp').resolves();
    sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([{ id: 'endpoint1' }, { id: 'endpoint2' }, { id: 'item1', state: 'NEW' }, { id: 'item2', state: 'NEW' }]);
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
    assert.isArray(result);
    assert.lengthOf(result, 2);
    assert.equal(result[0].id, 'item1');
    assert.equal(result[0].state, 'NEW');
    assert.equal(result[1].id, 'item2');
    assert.equal(result[1].state, 'NEW');
  });

  it('should return DFSP endpoints when DFSP is valid', async () => {
    const result = await DfspNetworkConfigService.getDFSPEndpoints(ctx, dfspId);
    assert.isArray(result);
    assert.lengthOf(result, 4);
    assert.equal(result[0].id, 'endpoint1');
    assert.equal(result[1].id, 'endpoint2');
  });

  it('should throw an error when DFSP is invalid', async () => {
    PkiService.validateDfsp.restore();
    sinon.stub(PkiService, 'validateDfsp').throws(new Error('Invalid DFSP'));

    try {
      await DfspNetworkConfigService.getDFSPEndpoints(ctx, dfspId);
      assert.fail('Expected error not thrown');
    } catch (error) {
      assert.equal(error.message, 'Invalid DFSP');
    }
    
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
    sinon.stub(PkiService, 'validateDfsp').resolves();
    sinon.stub(DfspNetworkConfigService, 'validateDirectionType').resolves();
    sinon.stub(DfspNetworkConfigService, 'deleteDFSPEndpoint').resolves({ success: true });
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  it('should delete DFSP Ingress URL endpoint successfully', async () => {
    const result = await DfspNetworkConfigService.deleteDFSPIngressUrlEndpoint(ctx, dfspId, epId);
    assert.isTrue(result.success);
  });

  it('should throw an error when validation fails', async () => {
    DfspNetworkConfigService.validateDirectionType.restore();
    sinon.stub(DfspNetworkConfigService, 'validateDirectionType').throws(new Error('Validation failed'));

    try {
      await DfspNetworkConfigService.deleteDFSPIngressUrlEndpoint(ctx, dfspId, epId);
      assert.fail('Expected error not thrown');
    } catch (error) {
      assert.equal(error.message, 'Validation failed');
    }
  });
});
describe('DfspNetworkConfigService', () => {
  let ctx;
  before(async () => {
    ctx = await createContext();
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
    destroyContext(ctx);
  });

  describe('DfspNetworkConfigService creating endpoint items', () => {
    let dfspId = null;

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

    it('should update a set of endpoints', async () => { // FIXME use a different operation, it needs to update the same id
      let urlBody = { value: { url: 'http://www.sun.com' } };

      await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
      let result = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
      assert.equal(result.value, urlBody.value.url);

      urlBody = { value: { url: 'http://www.oracle.com' } };

      await DfspNetworkConfigService.createDFSPIngressUrl(ctx, dfspId, urlBody);
      result = await DfspNetworkConfigService.getDFSPIngressUrls(ctx, dfspId);
      assert.equal(result.value, urlBody.value.url);
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

    it('should throw ValidationError when creating DFSP Egress IP with invalid IP format', async () => {
      const invalidBody = { value: { address: '999.999.999.999', ports: ['80'] } };
    
      try {
        await DfspNetworkConfigService.createDFSPEgressIp(ctx, dfspId, invalidBody);
        assert.fail('Expected ValidationError');
      } catch (error) {
        assert(error instanceof ValidationError);
        assert.include(error.message, 'Invalid IP address format');
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
});
