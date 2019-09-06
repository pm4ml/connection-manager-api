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
const assert = require('chai').assert;

describe('DfspNetworkConfigService', () => {
  before(async () => {
    await setupTestDB();
  });

  after(async () => {
    await tearDownTestDB();
  });

  describe('DfspNetworkConfigService creating endpoint items', () => {
    let envId = null;
    let dfspId = null;

    beforeEach('creating hook DFSP', async () => {
      let env = {
        name: 'DFSP_TEST_ENV',
        defaultDN: {
          ST: 'Street',
          C: 'Country',
          OU: 'Organizational Unit',
          CN: 'Common Name',
          L: 'Location',
          O: 'Organization'
        }
      };
      let result = await PkiService.createEnvironment(env);
      assert.property(result, 'id');
      assert.isNotNull(result.id);
      envId = result.id;

      let dfsp = {
        dfspId: 'DFSP_TEST_B',
        name: 'DFSP_TEST_B_description'
      };
      let resultDfsp = await PkiService.createDFSP(envId, dfsp);
      dfspId = resultDfsp.id;
    });

    afterEach('tearing down hook DFSP', async () => {
      await PkiService.deleteDFSP(envId, dfspId);
      await PkiService.deleteEnvironment(envId);
    });

    describe('DfspNetworkConfigService validations', () => {
      it('should throw ValidationError on illegal Egress IP', async () => {
        let illegalIPBody = { value: { address: '999.1.1.1', ports: [ '80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Ingress IP', async () => {
        let illegalIPBody = { value: { address: '999.1.1.1', ports: [ '80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Egress IP', async () => {
        let illegalIPBody = { value: { address: 'a.b.c.d', ports: [ '80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Ingress IP', async () => {
        let illegalIPBody = { value: { address: 'a.b.c.d', ports: [ '80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Ingress ports', async () => {
        let illegalIPBody = { value: { address: '1.1.1.1', ports: [ '-80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Ingress ports', async () => {
        let illegalIPBody = { value: { address: '1.1.1.1', ports: [ '80', '90000-' ] } };
        try {
          await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Egress ports', async () => {
        let illegalIPBody = { value: { address: '1.1.1.1', ports: [ '-80' ] } };
        try {
          await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal Egress ports', async () => {
        let illegalIPBody = { value: { address: '1.1.1.1', ports: [ '80', '90000-' ] } };
        try {
          await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, illegalIPBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError, 'Error is: ' + error);
        }
      });

      it('should throw ValidationError on illegal URL', async () => {
        let illegalUrlBody = { value: { url: 'ftp:www.sun.com' } };

        try {
          await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, illegalUrlBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError);
        }

        illegalUrlBody = { value: { url: 'www.sun.com' } };

        try {
          await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, illegalUrlBody);
          assert.fail();
        } catch (error) {
          assert(error instanceof ValidationError);
        }
      });
    });

    it('should create an ingress IP endpoint', async () => {
      let ipBody = { value: { address: '1.1.1.1', ports: [ '80', '8000-8080' ] } };
      await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, ipBody);
      let result = await DfspNetworkConfigService.getDFSPIngressIps(envId, dfspId);
      assert.equal(result[0].value.address, ipBody.value.address);
      assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
      assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);
    });

    it('should create more than one input IP entry', async () => {
      let ipBody = { value: { address: '1.1.1.1', ports: [ '80', '8000-8080' ] } };
      await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, ipBody);
      let result = await DfspNetworkConfigService.getDFSPIngressIps(envId, dfspId);
      assert.equal(result.length, 1);
      assert.equal(result[0].value.address, ipBody.value.address);
      assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
      assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);

      ipBody = { value: { address: '2.2.2.2', ports: [ '80' ] } };
      await DfspNetworkConfigService.createDFSPIngressIp(envId, dfspId, ipBody);
      result = await DfspNetworkConfigService.getDFSPIngressIps(envId, dfspId);
      assert.equal(result.length, 2);
      assert.equal(result[1].value.address, ipBody.value.address);
      assert.equal(result[1].value.ports[0], ipBody.value.ports[0]);

      let items = await DfspNetworkConfigService.getDFSPIngressIps(envId, dfspId);
      assert.equal(items.length, 2);
    });

    it('should create an egress IP endpoint', async () => {
      let ipBody = { value: { address: '1.1.1.1', ports: [ '80', '8000-8080' ] } };
      await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, ipBody);
      let result = await DfspNetworkConfigService.getDFSPEgressIps(envId, dfspId);
      assert.equal(result[0].value.address, ipBody.value.address);
      assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
      assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);
    });

    it('should create more than one egress IP entry', async () => {
      let ipBody = { value: { address: '1.1.1.1', ports: [ '80', '8000-8080' ] } };
      await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, ipBody);
      let result = await DfspNetworkConfigService.getDFSPEgressIps(envId, dfspId);
      assert.equal(result.length, 1);
      assert.equal(result[0].value.address, ipBody.value.address);
      assert.equal(result[0].value.ports[0], ipBody.value.ports[0]);
      assert.equal(result[0].value.ports[1], ipBody.value.ports[1]);

      ipBody = { value: { address: '2.2.2.2', ports: [ '80' ] } };
      await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, ipBody);
      result = await DfspNetworkConfigService.getDFSPEgressIps(envId, dfspId);
      assert.equal(result.length, 2);
      assert.equal(result[1].value.address, ipBody.value.address);
      assert.equal(result[1].value.ports[0], ipBody.value.ports[0]);

      let items = await DfspNetworkConfigService.getDFSPEgressIps(envId, dfspId);
      assert.equal(items.length, 2);
    });

    it('should create an IngressUrl', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let items = await DfspNetworkConfigService.getDFSPIngressUrls(envId, dfspId);
      assert.equal(items.length, 1);
    });

    it('should create more than one ingress URL entry', async () => {
      const COUNT = 10;
      for (let index = 0; index < COUNT; index++) {
        let urlBody = { value: { url: `http://www.sun${index}.com` } };
        await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      }
      let items = await DfspNetworkConfigService.getDFSPIngressUrls(envId, dfspId);
      assert.equal(items.length, COUNT);
    });

    xit('should update a set of endpoints', async () => { // FIXME use a different operation, it needs to update the same id
      let urlBody = { value: { url: 'http://www.sun.com' } };

      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let result = await DfspNetworkConfigService.getDFSPIngressUrls(envId, dfspId);
      assert.equal(result.value, urlBody.value.url);

      urlBody = { value: { url: 'http://www.oracle.com' } };

      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      result = await DfspNetworkConfigService.getDFSPIngressUrls(envId, dfspId);
      assert.equal(result.value, urlBody.value.url);
    });

    it('should not throw NotFoundError when no IngressUrl endpoint configured', async () => {
      let items = await DfspNetworkConfigService.getDFSPIngressUrls(envId, dfspId);
      assert.equal(items.length, 0);
    });

    it('should return the correct amount of unprocessed endpoints for URLs', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let items = await DfspNetworkConfigService.getUnprocessedEndpointItems(envId);
      assert.equal(items.length, 1);
    });

    it('should return the correct format for of unprocessed endpoints for URLs', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let items = await DfspNetworkConfigService.getUnprocessedEndpointItems(envId);
      assert.equal(items.length, 1);
      assert.equal(items[0].value.url, urlBody.value.url);
    });

    it('should return the correct format for of unprocessed endpoints for IPs', async () => {
      let ipBody = { value: { address: '1.1.1.1', ports: [ '80', '8000-8080' ] } };
      await DfspNetworkConfigService.createDFSPEgressIp(envId, dfspId, ipBody);
      let items = await DfspNetworkConfigService.getUnprocessedEndpointItems(envId);
      assert.equal(items.length, 1);
      assert.equal(items[0].value.address, ipBody.value.address);
    });

    it('should confirm an ingress URL endpoint', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      let result = await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);

      let confirmed = await DfspNetworkConfigService.confirmEndpointItem(envId, result.id);
      assert.equal(confirmed.state, 'CONFIRMED');
    });

    it('should create update delete an ingress URL via endpoint operations', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      let result = await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let loadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(envId, dfspId, result.id);
      assert.equal(loadedUrl.value.url, urlBody.value.url);
      loadedUrl.value.url = 'http://www.oracle.com';
      let updatedUrl = await DfspNetworkConfigService.updateDFSPEndpoint(envId, dfspId, result.id, loadedUrl);
      assert.equal(updatedUrl.value.url, loadedUrl.value.url);
      let newLoadedUrl = await DfspNetworkConfigService.getDFSPEndpoint(envId, dfspId, result.id);
      assert.equal(newLoadedUrl.value.url, loadedUrl.value.url);
      let emptyResponse = await DfspNetworkConfigService.deleteDFSPEndpoint(envId, dfspId, result.id);
      assert.isUndefined(emptyResponse);
      try {
        await DfspNetworkConfigService.getDFSPEndpoint(envId, dfspId, result.id);
        assert.fail('Should not have got here');
      } catch (error) {
        assert(error instanceof NotFoundError, 'Error is: ' + error);
      }
    });

    it('should return the dfspId as string when getting the UnprocessedEndpointItems', async () => {
      let urlBody = { value: { url: 'http://www.sun.com' } };
      await DfspNetworkConfigService.createDFSPIngressUrl(envId, dfspId, urlBody);
      let items = await DfspNetworkConfigService.getUnprocessedEndpointItems(envId);
      assert.equal(items.length, 1);
      assert.equal(items[0].dfsp_id, 'DFSP_TEST_B', JSON.stringify(items, null, 2));
    });
  });
});
