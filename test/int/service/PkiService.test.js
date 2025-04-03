const { expect } = require('chai');
const sinon = require('sinon');
const PkiService = require('../../../src/service/PkiService');
const DFSPModel = require('../../../src/models/DFSPModel');
const InternalError = require('../../../src/errors/InternalError');
const ValidationError = require('../../../src/errors/ValidationError');
const NotFoundError = require('../../../src/errors/NotFoundError');
const { createCSRAndDFSPOutboundEnrollment } = require('../../../src/service/DfspOutboundService');
const Constants = require('../../../src/constants/Constants');

describe('PkiService', () => {
  describe('createDFSP', () => {
    it('should create a DFSP and return its id', async () => {
      const ctx = {};
      const body = {
        dfspId: 'test-dfsp',
        name: 'Test DFSP',
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      sinon.stub(DFSPModel, 'create').resolves();
      sinon.stub(DFSPModel, 'createFxpSupportedCurrencies').resolves();

      const result = await PkiService.createDFSP(ctx, body);
      expect(result).to.deep.equal({ id: body.dfspId });

      DFSPModel.create.restore();
      DFSPModel.createFxpSupportedCurrencies.restore();
    });

    it('should throw an InternalError if DFSP creation fails', async () => {
      const ctx = {};
      const body = {
        dfspId: 'test-dfsp',
        name: 'Test DFSP',
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      sinon.stub(DFSPModel, 'create').throws(new Error('DB Error'));

      try {
        await PkiService.createDFSP(ctx, body);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceof(InternalError);
      }

      DFSPModel.create.restore();
    });
  });

  describe('createDFSPWithCSR', () => {
    it('should create a DFSP and generate CSR', async () => {
      const ctx = {};
      const body = {
        dfspId: 'test-dfsp',
        name: 'Test DFSP',
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      sinon.stub(PkiService, 'createDFSP').resolves({ id: body.dfspId });
      sinon.stub(createCSRAndDFSPOutboundEnrollment).resolves();

      const result = await PkiService.createDFSPWithCSR(ctx, body);
      expect(result).to.deep.equal({ id: body.dfspId });

      PkiService.createDFSP.restore();
      createCSRAndDFSPOutboundEnrollment.restore();
    });

    it('should throw an InternalError if CSR generation fails', async () => {
      const ctx = {};
      const body = {
        dfspId: 'test-dfsp',
        name: 'Test DFSP',
        monetaryZoneId: 'USD',
        isProxy: false,
        securityGroup: 'TestGroup',
        fxpCurrencies: ['USD', 'EUR']
      };

      sinon.stub(PkiService, 'createDFSP').resolves({ id: body.dfspId });
      sinon.stub(createCSRAndDFSPOutboundEnrollment).throws(new Error('CSR Error'));

      try {
        await PkiService.createDFSPWithCSR(ctx, body);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceof(InternalError);
      }

      PkiService.createDFSP.restore();
      createCSRAndDFSPOutboundEnrollment.restore();
    });
  });

  describe('getDFSPs', () => {
    it('should return all DFSPs', async () => {
      const ctx = {};
      const dfspRows = [
        { dfsp_id: 'dfsp1', name: 'DFSP 1', monetaryZoneId: 'USD', isProxy: false, security_group: 'Group1' },
        { dfsp_id: 'dfsp2', name: 'DFSP 2', monetaryZoneId: 'EUR', isProxy: true, security_group: 'Group2' }
      ];

      sinon.stub(DFSPModel, 'findAll').resolves(dfspRows);

      const result = await PkiService.getDFSPs(ctx);
      expect(result).to.deep.equal(dfspRows.map(PkiService.dfspRowToObject));

      DFSPModel.findAll.restore();
    });
  });

  describe('validateDfsp', () => {
    it('should validate DFSP existence', async () => {
      const ctx = {};
      const dfspId = 'test-dfsp';

      sinon.stub(PkiService, 'getDFSPById').resolves({ id: dfspId });

      const result = await PkiService.validateDfsp(ctx, dfspId);
      expect(result).to.deep.equal({ id: dfspId });

      PkiService.getDFSPById.restore();
    });
  });

  describe('getDFSPById', () => {
    it('should return a DFSP by its id', async () => {
      const ctx = {};
      const dfspId = 'test-dfsp';
      const dfspRow = { dfsp_id: dfspId, name: 'Test DFSP', monetaryZoneId: 'USD', isProxy: false, security_group: 'Group1' };

      sinon.stub(DFSPModel, 'findByDfspId').resolves(dfspRow);

      const result = await PkiService.getDFSPById(ctx, dfspId);
      expect(result).to.deep.equal(PkiService.dfspRowToObject(dfspRow));

      DFSPModel.findByDfspId.restore();
    });

    it('should throw NotFoundError if DFSP is not found', async () => {
      const ctx = {};
      const dfspId = 'test-dfsp';

      sinon.stub(DFSPModel, 'findByDfspId').throws(new NotFoundError());

      try {
        await PkiService.getDFSPById(ctx, dfspId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceof(NotFoundError);
      }

      DFSPModel.findByDfspId.restore();
    });

    it('should throw ValidationError if dfspId is invalid', async () => {
      const ctx = {};
      const dfspId = null;

      try {
        await PkiService.getDFSPById(ctx, dfspId);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceof(ValidationError);
      }
    });
  });

  describe('updateDFSP', () => {
    it('should update a DFSP', async () => {
      const ctx = {};
      const dfspId = 'test-dfsp';
      const newDfsp = { name: 'Updated DFSP', monetaryZoneId: 'EUR', isProxy: true, securityGroup: 'UpdatedGroup' };

      sinon.stub(DFSPModel, 'update').resolves();

      await PkiService.updateDFSP(ctx, dfspId, newDfsp);

      DFSPModel.update.restore();
    });

    it('should throw ValidationError if dfspId is invalid', async () => {
      const ctx = {};
      const dfspId = null;
      const newDfsp = { name: 'Updated DFSP', monetaryZoneId: 'EUR', isProxy: true, securityGroup: 'UpdatedGroup' };

      try {
        await PkiService.updateDFSP(ctx, dfspId, newDfsp);
        expect.fail('Should have thrown an error');
      } catch (err) {
        expect(err).to.be.instanceof(ValidationError);
      }
    });
  });

  describe('deleteDFSP', () => {
    it('should delete a DFSP by its id', async () => {
      const ctx = { pkiEngine: { deleteAllDFSPData: sinon.stub().resolves() } };
      const dfspId = 'test-dfsp';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);
      sinon.stub(DFSPModel, 'delete').resolves();

      await PkiService.deleteDFSP(ctx, dfspId);

      PkiService.validateDfsp.restore();
      DFSPModel.findIdByDfspId.restore();
      DFSPModel.delete.restore();
    });
  });

  describe('setDFSPca', () => {
    it('should set DFSP CA certificates', async () => {
      const ctx = { pkiEngine: { validateCACertificate: sinon.stub().resolves({ validations: [], validationState: 'VALID' }), setDFSPCA: sinon.stub().resolves() } };
      const dfspId = 'test-dfsp';
      const body = { rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' };

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);

      const result = await PkiService.setDFSPca(ctx, dfspId, body);
      expect(result).to.deep.equal({
        rootCertificate: body.rootCertificate,
        intermediateChain: body.intermediateChain,
        validations: [],
        validationState: 'VALID'
      });

      PkiService.validateDfsp.restore();
      DFSPModel.findIdByDfspId.restore();
    });
  });

  describe('getDFSPca', () => {
    it('should return DFSP CA certificates', async () => {
      const ctx = { pkiEngine: { getDFSPCA: sinon.stub().resolves({ rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' }) } };
      const dfspId = 'test-dfsp';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);

      const result = await PkiService.getDFSPca(ctx, dfspId);
      expect(result).to.deep.equal({ rootCertificate: 'root-cert', intermediateChain: 'intermediate-chain' });

      PkiService.validateDfsp.restore();
      DFSPModel.findIdByDfspId.restore();
    });

    it('should return default values if DFSP CA certificates are not found', async () => {
      const ctx = { pkiEngine: { getDFSPCA: sinon.stub().throws(new NotFoundError()) } };
      const dfspId = 'test-dfsp';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);

      const result = await PkiService.getDFSPca(ctx, dfspId);
      expect(result).to.deep.equal({
        rootCertificate: null,
        intermediateChain: null,
        validations: [],
        validationState: 'NOT_AVAILABLE'
      });

      PkiService.validateDfsp.restore();
      DFSPModel.findIdByDfspId.restore();
    });
  });

  describe('deleteDFSPca', () => {
    it('should delete DFSP CA certificates', async () => {
      const ctx = { pkiEngine: { deleteDFSPCA: sinon.stub().resolves() } };
      const dfspId = 'test-dfsp';

      sinon.stub(PkiService, 'validateDfsp').resolves();
      sinon.stub(DFSPModel, 'findIdByDfspId').resolves(1);

      await PkiService.deleteDFSPca(ctx, dfspId);

      PkiService.validateDfsp.restore();
      DFSPModel.findIdByDfspId.restore();
    });
  });

  describe('getDfspsByMonetaryZones', () => {
    it('should return DFSPs by monetary zone', async () => {
      const ctx = {};
      const monetaryZoneId = 'USD';
      const dfspRows = [
        { dfsp_id: 'dfsp1', name: 'DFSP 1', monetaryZoneId: 'USD', isProxy: false, security_group: 'Group1' },
        { dfsp_id: 'dfsp2', name: 'DFSP 2', monetaryZoneId: 'USD', isProxy: true, security_group: 'Group2' }
      ];

      sinon.stub(DFSPModel, 'getDfspsByMonetaryZones').resolves(dfspRows);

      const result = await PkiService.getDfspsByMonetaryZones(ctx, monetaryZoneId);
      expect(result).to.deep.equal(dfspRows.map(PkiService.dfspRowToObject));

      DFSPModel.getDfspsByMonetaryZones.restore();
    });
  });
});