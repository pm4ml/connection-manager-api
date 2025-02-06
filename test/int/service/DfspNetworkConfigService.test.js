const chai = require('chai');
const sinon = require('sinon');
const { mockContext } = require('../utils/tlsUtils.test');
const {
  getDfspStatus,
  createDFSPEgress,
  getDFSPEgress,
  createDFSPEgressIp,
  createDFSPIngress,
  getDFSPIngress,
  createDFSPIngressIp,
  getDFSPEgressIps,
  getDFSPIngressIps,
  createDFSPIngressUrl,
  getDFSPIngressUrls,
  getUnprocessedEndpointItems,
  getUnprocessedDfspItems,
  confirmEndpointItem,
  getDFSPEndpoint,
  getDFSPEndpoints,
  updateDFSPEndpoint,
  deleteDFSPEndpoint,
  getDFSPIngressIpEndpoint,
  updateDFSPIngressIpEndpoint,
  deleteDFSPIngressIpEndpoint,
  getDFSPEgressIpEndpoint,
  updateDFSPEgressIpEndpoint,
  deleteDFSPEgressIpEndpoint,
  getDFSPIngressUrlEndpoint,
  updateDFSPIngressUrlEndpoint,
  deleteDFSPIngressUrlEndpoint,
  StatusEnum,
  PhaseEnum,
  StepEnum,
  DirectionEnum
} = require('../../../src/service/DfspNetworkConfigService');

const PkiService = require('../../../src/service/PkiService');
const DFSPModel = require('../../../src/models/DFSPModel');
const DFSPEndpointItemModel = require('../../../src/models/DFSPEndpointItemModel');
const DFSPEndpointModel = require('../../../src/models/DFSPEndpointModel');
const ValidationError = require('../../../src/errors/ValidationError');
const NotFoundError = require('../../../src/errors/NotFoundError');

const expect = chai.expect;

describe('DFSPService', () => {
  let ctx;

  beforeEach(() => {
    ctx = mockContext(); // Use the mockContext utility
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('getDfspStatus', () => {
    it('should return default status when no dfsp data found', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').resolves({});
      sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([]);
      const dfspId = 'testDfspId';
      const status = await getDfspStatus(ctx, dfspId);

      expect(status).to.deep.equal([
        { phase: 'BUSINESS_SETUP', steps: [ { identifier: 'ID_GENERATION', status: 'NOT_STARTED' } ] },
        {
          phase: 'TECHNICAL_SETUP',
          steps: [
            { identifier: 'ENDPOINTS', status: 'NOT_STARTED' },
            { identifier: 'CSR_EXCHANGE', status: 'NOT_STARTED' },
            { identifier: 'CERTIFICATE_AUTHORITY', status: 'NOT_STARTED' },
            { identifier: 'SERVER_CERTIFICATES_EXCHANGE', status: 'NOT_STARTED' },
            { identifier: 'JWS_CERTIFICATES', status: 'NOT_STARTED' }
          ]
        }
      ]);
    });

    it('should update ID_GENERATION status to COMPLETED when dfsp record is found', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').resolves({ id: '123', name: 'Test DFSP' });
      sinon.stub(DFSPEndpointItemModel, 'findObjectAll').resolves([]);

      const dfspId = 'testDfspId';
      const status = await getDfspStatus(ctx, dfspId);

      expect(status[0].steps[0].status).to.equal('COMPLETED');
    });

    it('should throw NotFoundError if findByDfspId throws NotFoundError', async () => {
      sinon.stub(DFSPModel, 'findByDfspId').rejects(new NotFoundError('DFSP not found'));
      await expect(getDfspStatus(ctx, 'testDfspId')).to.be.rejectedWith(NotFoundError, 'Status for environment: dfsp: testDfspId not found');
    });

    it('should re-throw other errors from database', async () => {
       sinon.stub(DFSPModel, 'findByDfspId').rejects(new Error('Database error'));
       await expect(getDfspStatus(ctx, 'testDfspId')).to.be.rejectedWith(Error, 'Database error');
    });

    // Add more tests for other scenarios, e.g., handling endpoints etc.
  });

  describe('createDFSPEgress', () => {
    it('should create a DFSP Egress and return the transformed result', async () => {
      const dfspId = 'testDfspId';
      const body = { key1: 'value1', key2: 'value2' };
      const createdId = 'egressId123';
      const findByIdResult = {
        id: createdId,
        dfsp_id: dfspId,
        created_by: 'user',
        created_at: new Date(),
        state: 'NEW',
        direction: 'EGRESS',
        key1: 'value1',
        key2: 'value2'
      };

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'create').resolves(createdId);
      sinon.stub(DFSPEndpointModel, 'findById').withArgs(createdId).resolves(findByIdResult);

      const result = await createDFSPEgress(ctx, dfspId, body);

      expect(result).to.deep.equal({
        id: createdId,
        dfspId: dfspId,
        state: 'NEW',
        createdBy: 'user',
        createdAt: findByIdResult.created_at,
        key1: 'value1',
        key2: 'value2'
      });

      expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
      expect(DFSPEndpointModel.create.calledOnceWith(dfspId, StatusEnum.NOT_STARTED, DirectionEnum.EGRESS, body)).to.be.true;
      expect(DFSPEndpointModel.findById.calledOnceWith(createdId)).to.be.true;
    });

    it('should propagate errors from PkiService.validateDfsp', async () => {
        sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

        await expect(createDFSPEgress(ctx, 'testDfspId', {})).to.be.rejectedWith(Error, 'Validation failed');
    });
  });

  describe('getDFSPEgress', () => {
    it('should return the latest DFSP Egress configuration', async () => {
      const dfspId = 'testDfspId';
      const egressConfig = {
        id: 'egressId123',
        dfsp_id: dfspId,
        created_by: 'user',
        created_at: new Date(),
        state: 'NEW',
        direction: 'EGRESS',
        key1: 'value1',
        key2: 'value2'
      };

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'findLastestByDirection').withArgs(dfspId, DirectionEnum.EGRESS).resolves(egressConfig);

      const result = await getDFSPEgress(ctx, dfspId);

      expect(result).to.deep.equal({
        id: 'egressId123',
        dfspId: dfspId,
        state: 'NEW',
        createdBy: 'user',
        createdAt: egressConfig.created_at,
        key1: 'value1',
        key2: 'value2'
      });

      expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
      expect(DFSPEndpointModel.findLastestByDirection.calledOnceWith(dfspId, DirectionEnum.EGRESS)).to.be.true;
    });

    it('should throw NotFoundError if no Egress configuration is found', async () => {
      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointModel, 'findLastestByDirection').withArgs('testDfspId', DirectionEnum.EGRESS).resolves(null);

      await expect(getDFSPEgress(ctx, 'testDfspId')).to.be.rejectedWith(NotFoundError, 'Endpoint configuration not found!');
    });
  });

  describe('createDFSPEgressIp', () => {
    it('should create a new IP entry for DFSP Egress endpoint', async () => {
      const dfspId = 'testDfspId';
      const body = { value: { address: '192.168.1.1', ports: [8080, 8443] } };
      const endpointItem = {
        state: 'NEW',
        type: 'IP',
        value: JSON.stringify(body.value),
        dfspId: 'testDfspId',
        direction: 'EGRESS',
      };
      const createdId = 'endpointItemId123';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPEndpointItemModel, 'create').resolves(createdId);
      sinon.stub(DFSPEndpointItemModel, 'findObjectById').withArgs(createdId).resolves({...endpointItem, id:createdId});

      const result = await createDFSPEgressIp(ctx, dfspId, body);

      expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
      expect(DFSPEndpointItemModel.create.calledOnce).to.be.true;
      expect(DFSPEndpointItemModel.findObjectById.calledOnceWith(createdId)).to.be.true;
      expect(result).to.deep.equal({...endpointItem, id:createdId});
    });

    it('should throw ValidationError if no address is received', async () => {
      const dfspId = 'testDfspId';
      const body = { value: { ports: [8080, 8443] } };

      sinon.stub(PkiService, 'validateDfsp').resolves();

      await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No address received');
    });

    it('should throw ValidationError if no ports are received', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: '192.168.1.1' } };

        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No ports received');
    });

    it('should throw ValidationError if ports is not an array', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: '192.168.1.1', ports: '8080, 8443' } };

        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No ports array received');
    });

    it('should throw ValidationError if ports array is empty', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: '192.168.1.1', ports: [] } };

        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Empty ports array received');
    });

    it('should throw ValidationError for invalid IP address', async () => {
      const dfspId = 'testDfspId';
      const body = { value: { address: 'invalid-ip', ports: [8080] } };
      sinon.stub(PkiService, 'validateDfsp').resolves();

      await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Invalid IP Address');
    });

    it('should throw ValidationError for invalid port', async () => {
      const dfspId = 'testDfspId';
      const body = { value: { address: '192.168.1.1', ports: [65536] } };
      sinon.stub(PkiService, 'validateDfsp').resolves();

      await expect(createDFSPEgressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Invalid port number: 65536');
    });

  });

  describe('createDFSPIngress', () => {
      it('should create a DFSP Ingress and return the transformed result', async () => {
        const dfspId = 'testDfspId';
        const body = { key1: 'value1', key2: 'value2' };
        const createdId = 'ingressId123';
        const findByIdResult = {
          id: createdId,
          dfsp_id: dfspId,
          created_by: 'user',
          created_at: new Date(),
          state: 'NEW',
          direction: 'INGRESS',
          key1: 'value1',
          key2: 'value2'
        };

        sinon.stub(PkiService, 'validateDfsp').resolves();
        sinon.stub(DFSPEndpointModel, 'create').resolves(createdId);
        sinon.stub(DFSPEndpointModel, 'findById').withArgs(createdId).resolves(findByIdResult);

        const result = await createDFSPIngress(ctx, dfspId, body);

        expect(result).to.deep.equal({
          id: createdId,
          dfspId: dfspId,
          state: 'NEW',
          createdBy: 'user',
          createdAt: findByIdResult.created_at,
          key1: 'value1',
          key2: 'value2'
        });

        expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
        expect(DFSPEndpointModel.create.calledOnceWith(dfspId, StatusEnum.NOT_STARTED, DirectionEnum.INGRESS, body)).to.be.true;
        expect(DFSPEndpointModel.findById.calledOnceWith(createdId)).to.be.true;
      });

      it('should propagate errors from PkiService.validateDfsp', async () => {
          sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

          await expect(createDFSPIngress(ctx, 'testDfspId', {})).to.be.rejectedWith(Error, 'Validation failed');
      });
  });

  describe('getDFSPIngress', () => {
      it('should return the latest DFSP Ingress configuration', async () => {
        const dfspId = 'testDfspId';
        const ingressConfig = {
          id: 'ingressId123',
          dfsp_id: dfspId,
          created_by: 'user',
          created_at: new Date(),
          state: 'NEW',
          direction: 'INGRESS',
          key1: 'value1',
          key2: 'value2'
        };

        sinon.stub(PkiService, 'validateDfsp').resolves();
        sinon.stub(DFSPEndpointModel, 'findLastestByDirection').withArgs(dfspId, DirectionEnum.INGRESS).resolves(ingressConfig);

        const result = await getDFSPIngress(ctx, dfspId);

        expect(result).to.deep.equal({
          id: 'ingressId123',
          dfspId: dfspId,
          state: 'NEW',
          createdBy: 'user',
          createdAt: ingressConfig.created_at,
          key1: 'value1',
          key2: 'value2'
        });

        expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
        expect(DFSPEndpointModel.findLastestByDirection.calledOnceWith(dfspId, DirectionEnum.INGRESS)).to.be.true;
      });

      it('should throw NotFoundError if no Ingress configuration is found', async () => {
        sinon.stub(PkiService, 'validateDfsp').resolves();
        sinon.stub(DFSPEndpointModel, 'findLastestByDirection').withArgs('testDfspId', DirectionEnum.INGRESS).resolves(null);

        await expect(getDFSPIngress(ctx, 'testDfspId')).to.be.rejectedWith(NotFoundError, 'Endpoint configuration not found!');
      });
  });

  describe('createDFSPIngressIp', () => {
      it('should create a new IP entry for DFSP Ingress endpoint', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: '192.168.1.1', ports: [8080, 8443] } };
        const endpointItem = {
          state: 'NEW',
          type: 'IP',
          value: JSON.stringify(body.value),
          dfspId: 'testDfspId',
          direction: 'INGRESS',
        };
        const createdId = 'endpointItemId123';

        sinon.stub(PkiService, 'validateDfsp').resolves();
        sinon.stub(DFSPEndpointItemModel, 'create').resolves(createdId);
        sinon.stub(DFSPEndpointItemModel, 'findObjectById').withArgs(createdId).resolves({...endpointItem, id:createdId});

        const result = await createDFSPIngressIp(ctx, dfspId, body);

        expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
        expect(DFSPEndpointItemModel.create.calledOnce).to.be.true;
        expect(DFSPEndpointItemModel.findObjectById.calledOnceWith(createdId)).to.be.true;
        expect(result).to.deep.equal({...endpointItem, id:createdId});
      });

      it('should throw ValidationError if no address is received', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { ports: [8080, 8443] } };

        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No address received');
      });

      it('should throw ValidationError if no ports are received', async () => {
          const dfspId = 'testDfspId';
          const body = { value: { address: '192.168.1.1' } };

          sinon.stub(PkiService, 'validateDfsp').resolves();

          await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No ports received');
      });

      it('should throw ValidationError if ports is not an array', async () => {
          const dfspId = 'testDfspId';
          const body = { value: { address: '192.168.1.1', ports: '8080, 8443' } };

          sinon.stub(PkiService, 'validateDfsp').resolves();

          await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No ports array received');
      });

      it('should throw ValidationError if ports array is empty', async () => {
          const dfspId = 'testDfspId';
          const body = { value: { address: '192.168.1.1', ports: [] } };

          sinon.stub(PkiService, 'validateDfsp').resolves();

          await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Empty ports array received');
      });

      it('should throw ValidationError for invalid IP address', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: 'invalid-ip', ports: [8080] } };
        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Invalid IP Address');
      });

      it('should throw ValidationError for invalid port', async () => {
        const dfspId = 'testDfspId';
        const body = { value: { address: '192.168.1.1', ports: [65536] } };
        sinon.stub(PkiService, 'validateDfsp').resolves();

        await expect(createDFSPIngressIp(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Invalid port number: 65536');
      });

  });

  describe('getDFSPEgressIps', () => {
      it('should return list of Egress IPs', async () => {
          const dfspId = 'testDfspId';
          const egressIps = [
              { id: '1', address: '192.168.1.1', ports: [8080] },
              { id: '2', address: '192.168.1.2', ports: [8081] }
          ];

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findObjectByDirectionType').withArgs('EGRESS', 'IP', dfspId).resolves(egressIps);

          const result = await getDFSPEgressIps(ctx, dfspId);

          expect(result).to.deep.equal(egressIps);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findObjectByDirectionType.calledOnceWith('EGRESS', 'IP', dfspId)).to.be.true;
      });
  });

  describe('getDFSPIngressIps', () => {
      it('should return list of Ingress IPs', async () => {
          const dfspId = 'testDfspId';
          const ingressIps = [
              { id: '1', address: '192.168.1.1', ports: [8080] },
              { id: '2', address: '192.168.1.2', ports: [8081] }
          ];

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findObjectByDirectionType').withArgs('INGRESS', 'IP', dfspId).resolves(ingressIps);

          const result = await getDFSPIngressIps(ctx, dfspId);

          expect(result).to.deep.equal(ingressIps);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findObjectByDirectionType.calledOnceWith('INGRESS', 'IP', dfspId)).to.be.true;
      });
  });

  describe('createDFSPIngressUrl', () => {
      it('should create a new URL entry for DFSP Ingress endpoint', async () => {
          const dfspId = 'testDfspId';
          const body = { value: { url: 'https://example.com' } };
          const endpointItem = {
            state: 'NEW',
            type: 'URL',
            value: JSON.stringify(body.value),
            dfspId: 'testDfspId',
            direction: 'INGRESS',
          };
          const createdId = 'endpointItemId123';

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'create').resolves(createdId);
          sinon.stub(DFSPEndpointItemModel, 'findObjectById').withArgs(createdId).resolves({...endpointItem, id:createdId});

          const result = await createDFSPIngressUrl(ctx, dfspId, body);

          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.create.calledOnce).to.be.true;
          expect(DFSPEndpointItemModel.findObjectById.calledOnceWith(createdId)).to.be.true;
          expect(result).to.deep.equal({...endpointItem, id:createdId});
      });

      it('should throw ValidationError if no URL is received', async () => {
          const dfspId = 'testDfspId';
          const body = { value: {} };

          sinon.stub(PkiService, 'validateDfsp').resolves();

          await expect(createDFSPIngressUrl(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'No URL received');
      });

      it('should throw ValidationError for invalid URL', async () => {
          const dfspId = 'testDfspId';
          const body = { value: { url: 'invalid-url' } };

          sinon.stub(PkiService, 'validateDfsp').resolves();

          await expect(createDFSPIngressUrl(ctx, dfspId, body)).to.be.rejectedWith(ValidationError, 'Invalid URL format');
      });
  });

  describe('getDFSPIngressUrls', () => {
      it('should return list of Ingress URLs', async () => {
          const dfspId = 'testDfspId';
          const ingressUrls = [
              { id: '1', url: 'https://example.com' },
              { id: '2', url: 'https://example2.com' }
          ];

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findObjectByDirectionType').withArgs('INGRESS', 'URL', dfspId).resolves(ingressUrls);

          const result = await getDFSPIngressUrls(ctx, dfspId);

          expect(result).to.deep.equal(ingressUrls);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findObjectByDirectionType.calledOnceWith('INGRESS', 'URL', dfspId)).to.be.true;
      });
  });

  describe('getUnprocessedEndpointItems', () => {
      it('should return list of unprocessed endpoint items', async () => {
          const unprocessedItems = [
              { id: '1', url: 'https://example.com', state: 'NEW' },
              { id: '2', url: 'https://example2.com', state: 'NEW' }
          ];

          sinon.stub(DFSPEndpointItemModel, 'findAllEnvState').withArgs('NEW').resolves(unprocessedItems);

          const result = await getUnprocessedEndpointItems(ctx);

          expect(result).to.deep.equal(unprocessedItems);
          expect(DFSPEndpointItemModel.findAllEnvState.calledOnceWith('NEW')).to.be.true;
      });
  });

  describe('getUnprocessedDfspItems', () => {
      it('should return list of unprocessed dfsp items', async () => {
          const dfspId = 'testDfspId';
          const unprocessedItems = [
              { id: '1', url: 'https://example.com', state: 'NEW' },
              { id: '2', url: 'https://example2.com', state: 'NEW' }
          ];

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findAllDfspState').withArgs(dfspId, 'NEW').resolves(unprocessedItems);

          const result = await getUnprocessedDfspItems(ctx, dfspId);

          expect(result).to.deep.equal(unprocessedItems);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findAllDfspState.calledOnceWith(dfspId, 'NEW')).to.be.true;
      });

      it('should propagate errors from PkiService.validateDfsp', async () => {
          sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

          await expect(getUnprocessedDfspItems(ctx, 'testDfspId')).to.be.rejectedWith(Error, 'Validation failed');
      });
  });

  describe('confirmEndpointItem', () => {
      it('should confirm the endpoint item', async () => {
          const dfspId = 'testDfspId';
          const epId = 'epId123';

          sinon.stub(DFSPEndpointItemModel, 'update').withArgs(dfspId, epId, { state: 'CONFIRMED' }).resolves();

          await confirmEndpointItem(ctx, dfspId, epId);

          expect(DFSPEndpointItemModel.update.calledOnceWith(dfspId, epId, { state: 'CONFIRMED' })).to.be.true;
      });
  });

  describe('getDFSPEndpoint', () => {
      it('should return the endpoint item', async () => {
          const dfspId = 'testDfspId';
          const epId = 'epId123';
          const endpointItem = { id: epId, url: 'https://example.com' };

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findObjectById').withArgs(epId).resolves(endpointItem);

          const result = await getDFSPEndpoint(ctx, dfspId, epId);

          expect(result).to.deep.equal(endpointItem);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findObjectById.calledOnceWith(epId)).to.be.true;
      });

      it('should propagate errors from PkiService.validateDfsp', async () => {
          sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

          await expect(getDFSPEndpoint(ctx, 'testDfspId', 'epId123')).to.be.rejectedWith(Error, 'Validation failed');
      });
  });

  describe('getDFSPEndpoints', () => {
      it('should return all endpoint items', async () => {
          const dfspId = 'testDfspId';
          const endpointItems = [
              { id: '1', url: 'https://example.com' },
              { id: '2', url: 'https://example2.com' }
          ];

          sinon.stub(PkiService, 'validateDfsp').resolves();
          sinon.stub(DFSPEndpointItemModel, 'findObjectAll').withArgs(dfspId).resolves(endpointItems);

          const result = await getDFSPEndpoints(ctx, dfspId);

          expect(result).to.deep.equal(endpointItems);
          expect(PkiService.validateDfsp.calledOnceWith(ctx, dfspId)).to.be.true;
          expect(DFSPEndpointItemModel.findObjectAll.calledOnceWith(dfspId)).to.be.true;
      });

      it('should propagate errors from PkiService.validateDfsp', async () => {
          sinon.stub(PkiService, 'validateDfsp').rejects(new Error('Validation failed'));

          await expect(getDFSPEndpoints(ctx, 'testDfspId')).to.be.rejectedWith(Error, 'Validation failed');
      });
  });
});