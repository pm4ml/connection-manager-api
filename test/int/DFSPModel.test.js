const { expect } = require('chai');
const sinon = require('sinon');
const knex = require('../../src/db/database').knex;
const DFSPModel = require('../../src/models/DFSPModel');
const NotFoundError = require('../../src/errors/NotFoundError');
const InternalError = require('../../src/errors/InternalError');

describe('DFSPModel', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findByDfspId', () => {
    it('should return dfsp when found', async () => {
      const dfspId = 'test-dfsp-id';
      const dfsp = { id: 1, dfsp_id: dfspId };
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([dfsp])
        })
      });

      const result = await DFSPModel.findByDfspId(dfspId);
      expect(result).to.deep.equal(dfsp);
    });

    it('should throw NotFoundError when dfsp not found', async () => {
      const dfspId = 'test-dfsp-id';
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([])
        })
      });

      try {
        await DFSPModel.findByDfspId(dfspId);
        throw new Error('Expected NotFoundError');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });

    it('should throw InternalError when multiple dfsps found', async () => {
      const dfspId = 'test-dfsp-id';
      const dfsp = { id: 1, dfsp_id: dfspId };
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([dfsp, dfsp])
        })
      });

      try {
        await DFSPModel.findByDfspId(dfspId);
        throw new Error('Expected InternalError');
      } catch (err) {
        expect(err).to.be.instanceOf(InternalError);
      }
    });
  });

  describe('getDfspsByMonetaryZones', () => {
    it('should return dfsps when found', async () => {
      const monetaryZoneId = 'test-zone-id';
      const dfsps = [{ id: 1, monetaryZoneId }];
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(dfsps)
        })
      });

      const result = await DFSPModel.getDfspsByMonetaryZones(monetaryZoneId);
      expect(result).to.deep.equal(dfsps);
    });

    it('should throw NotFoundError when dfsps not found', async () => {
      const monetaryZoneId = 'test-zone-id';
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([])
        })
      });

      try {
        await DFSPModel.getDfspsByMonetaryZones(monetaryZoneId);
        throw new Error('Expected NotFoundError');
      } catch (err) {
        expect(err).to.be.instanceOf(NotFoundError);
      }
    });
  });

  describe('getFxpSupportedCurrencies', () => {
    it('should return supported currencies', async () => {
      const dfspId = 'test-dfsp-id';
      const currencies = [{ monetaryZoneId: 'zone1' }, { monetaryZoneId: 'zone2' }];
      sandbox.stub(knex, 'table').returns({
        join: sinon.stub().returns({
          where: sinon.stub().returns({
            select: sinon.stub().resolves(currencies)
          })
        })
      });

      const result = await DFSPModel.getFxpSupportedCurrencies(dfspId);
      expect(result).to.deep.equal(['zone1', 'zone2']);
    });
  });
describe('createFxpSupportedCurrencies', () => {
  it('should insert fxp supported currencies when monetaryZoneIds are provided', async () => {
    const dfsp_id = 'test-dfsp-id';
    const monetaryZoneIds = ['zone1', 'zone2'];
    const dfsp = { id: 1, dfsp_id };
    sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(dfsp.id);
    const insertStub = sandbox.stub(knex, 'table').returns({
      insert: sinon.stub().resolves()
    });

    await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);
    expect(insertStub.calledWith('fxp_supported_currencies')).to.be.true;
    expect(insertStub().insert.calledWith([
      { dfspId: dfsp.id, monetaryZoneId: 'zone1' },
      { dfspId: dfsp.id, monetaryZoneId: 'zone2' }
    ])).to.be.true;
  });

  it('should not insert fxp supported currencies when monetaryZoneIds are not provided', async () => {
    const dfsp_id = 'test-dfsp-id';
    const monetaryZoneIds = [];
    const insertStub = sandbox.stub(knex, 'table');

    await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);
    expect(insertStub.called).to.be.false;
  });
});

describe('deleteByRawId', () => {
  it('should delete dfsp by raw id', async () => {
    const id = 1;
    const delStub = sandbox.stub(knex, 'table').returns({
      where: sinon.stub().returns({
        del: sinon.stub().resolves(1)
      })
    });

    const result = await DFSPModel.deleteByRawId(id);
    expect(delStub.calledWith(DFSP_TABLE)).to.be.true;
    expect(delStub().where.calledWith({ id })).to.be.true;
    expect(result).to.equal(1);
  });
});
});


