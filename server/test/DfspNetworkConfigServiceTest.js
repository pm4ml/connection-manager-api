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

const PkiService = require('../src/service/PkiService');
const DfspNetworkConfigService = require('../src/service/DfspNetworkConfigService');
const ValidationError = require('../src/errors/ValidationError');
const NotFoundError = require('../src/errors/NotFoundError');
const { assert } = require('chai');
const { createContext, destroyContext } = require('./context');

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

    xit('should update a set of endpoints', async () => { // FIXME use a different operation, it needs to update the same id
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
        const getDFSPEgressResult = await DfspNetworkConfigService.getDFSPEgress(ctx, dfspId);
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
      assert.equal(createDFSPEgressResult.dfsp_id, dfspId);
      assert.equal(getDFSPEgressResult.dfsp_id, dfspId);
      assert.deepEqual(createDFSPEgressResult.ipList, body.ipList);
      assert.deepEqual(getDFSPEgressResult.ipList, body.ipList);
    });

    it('should return a NotFound exception when Endpoint Ingress config doesnt exist', async () => {
      try {
        const getDFSPIngressResult = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
        assert.fail('NotFoundError should have been thrown');
      } catch (error) {
        assert(error instanceof NotFoundError, 'Error is: ' + error);
      }
    });

    it('should create an Endpoint Ingress config', async () => {
      const body = {
        url: 'string'
      };

      const createDFSPIngressResult = await DfspNetworkConfigService.createDFSPIngress(ctx, dfspId, body);
      const getDFSPIngressResult = await DfspNetworkConfigService.getDFSPIngress(ctx, dfspId);
      assert.equal(createDFSPIngressResult.dfsp_id, dfspId);
      assert.equal(getDFSPIngressResult.dfsp_id, dfspId);
      assert.deepEqual(createDFSPIngressResult.url, body.url);
      assert.deepEqual(getDFSPIngressResult.url, body.url);
    });
  });
});
