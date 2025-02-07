const { expect } = require('chai');
const sinon = require('sinon');
const knex = require('../../../src/db/database').knex;
const DFSPModel = require('../../../src/models/DFSPModel');
const DFSPEndpointItemModel = require('../../../src/models/DFSPEndpointItemModel');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');

describe('DFSPEndpointItemModel', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
  });

  describe('findById', () => {
    it('should return the item when found', async () => {
      const id = 1;
      const mockRow = { id: 1, value: 'test' };
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([mockRow])
        })
      });

      const result = await DFSPEndpointItemModel.findById(id);
      expect(result).to.deep.equal(mockRow);
    });

    it('should return the item when found with id in array', async () => {
      // initialize const id as an array
      const id = [1];
      // const id = 1;
      const mockRow = { id: 1, value: 'test' };
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([mockRow])
        })
      });

      const result = await DFSPEndpointItemModel.findById(id);
      expect(result).to.deep.equal(mockRow);
    });

    it('should throw NotFoundError when item is not found', async () => {
      const id = 1;
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([])
        })
      });

      try {
        await DFSPEndpointItemModel.findById(id);
      } catch (error) {
        expect(error).to.be.instanceOf(NotFoundError);
      }
    });

    it('should throw InternalError when multiple items are found', async () => {
      const id = 1;
      const mockRows = [{ id: 1, value: 'test' }, { id: 1, value: 'test2' }];
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(mockRows)
        })
      });

      try {
        await DFSPEndpointItemModel.findById(id);
      } catch (error) {
        expect(error).to.be.instanceOf(InternalError);
      }
    });
  });

  describe('findObjectById', () => {
    it('should return the parsed object when found', async () => {
      const id = 1;
      const mockRow = { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 };
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(DFSPEndpointItemModel, 'findById').resolves(mockRow);
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectById(id);
      expect(result).to.deep.equal({ id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 });
    });
  });

  describe('findObjectAll', () => {
    it('should return all parsed objects for a given dfspId', async () => {
      const dfspId = 'dfsp1';
      const mockDfspId = 1;
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(mockRows)
        })
      });
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectAll(dfspId);
      expect(result).to.deep.equal([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('create', () => {
    it('should create a new endpoint item', async () => {
      const values = {
        state: 'ACTIVE',
        type: 'IP',
        value: JSON.stringify({ ip: '127.0.0.1' }),
        dfspId: 'dfsp1',
        direction: 'INBOUND'
      };
      const mockDfspId = 1;
      sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
      sandbox.stub(knex, 'table').returns({
        insert: sinon.stub().resolves([1])
      });

      const result = await DFSPEndpointItemModel.create(values);
      expect(result).to.deep.equal([1]);
    });
  });

  describe('delete', () => {
    it('should delete an endpoint item by id', async () => {
      const id = 1;
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          del: sinon.stub().resolves(1)
        })
      });

      const result = await DFSPEndpointItemModel.delete(id);
      expect(result).to.equal(1);
    });
  });

  describe('findAllEnvState', () => {
    it('should return all environment items with a specific state', async () => {
      const state = 'ACTIVE';
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(knex, 'table').returns({
        join: sinon.stub().returns({
          where: sinon.stub().returns({
            select: sinon.stub().resolves(mockRows)
          })
        })
      });
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.findAllEnvState(state);
      expect(result).to.deep.equal([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });


  describe('findObjectByDirectionType', () => {
    it('should return all parsed objects for a given direction and type', async () => {
      const direction = 'INBOUND';
      const type = 'IP';
      const dfspId = 'dfsp1';
      const mockDfspId = 1;
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(mockRows)
        })
      });
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.findObjectByDirectionType(direction, type, dfspId);
      expect(result).to.deep.equal([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('findConfirmedByDirectionType', () => {
    it('should return all confirmed parsed objects for a given direction and type', async () => {
      const direction = 'INBOUND';
      const type = 'IP';
      const mockRows = [
        { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
        { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
      ];
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(mockRows)
        })
      });
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.findConfirmedByDirectionType(direction, type);
      expect(result).to.deep.equal([
        { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
        { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
      ]);
    });
  });

  describe('update', () => {
    it('should update an endpoint item by id and dfspId', async () => {
      const dfspId = 'dfsp1';
      const id = 1;
      const endpointItem = { state: 'INACTIVE' };
      const mockDfspId = 1;
      const mockRow = { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 };
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          update: sinon.stub().resolves(1)
        })
      });
      sandbox.stub(DFSPEndpointItemModel, 'findObjectById').resolves(mockRow);
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      const result = await DFSPEndpointItemModel.update(dfspId, id, endpointItem);
      expect(result).to.deep.equal({ id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 });
    });

    it('should throw error when updating an endpoint item by id and dfspId', async () => {
      const dfspId = 'dfsp10000';
      const id = 'xxx';
      const endpointItem = { state: 'INACTIVE' };
      const mockDfspId = 1;
      const mockRow = { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 };
      const mockDfsp = { dfsp_id: 1 };
      sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
      sandbox.stub(knex, 'table').returns({
        where: sinon.stub().returns({
          update: sinon.stub().resolves(1)
        })
      });
      sandbox.stub(DFSPEndpointItemModel, 'findObjectById').resolves(mockRow);
      sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

      try {
        await DFSPEndpointItemModel.update(dfspId, id, endpointItem);
      } catch (error) {
        expect(error).to.be.instanceOf(InternalError);
      }
    });
  });
describe('findAllDfspState', () => {
  it('should return all DFSP items with a specific state', async () => {
    const dfspId = 'dfsp1';
    const state = 'ACTIVE';
    const mockDfspId = 1;
    const mockRows = [
      { id: 1, value: JSON.stringify({ ip: '127.0.0.1' }), dfsp_id: 1 },
      { id: 2, value: JSON.stringify({ ip: '127.0.0.2' }), dfsp_id: 1 }
    ];
    const mockDfsp = { dfsp_id: 1 };
    sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
    sandbox.stub(knex, 'table').returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves(mockRows)
        })
      })
    });
    sandbox.stub(DFSPModel, 'findByRawId').resolves(mockDfsp);

    const result = await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
    expect(result).to.deep.equal([
      { id: 1, value: { ip: '127.0.0.1' }, dfsp_id: 1 },
      { id: 2, value: { ip: '127.0.0.2' }, dfsp_id: 1 }
    ]);
  });

  it('should return an empty array if no items are found', async () => {
    const dfspId = 'dfsp1';
    const state = 'ACTIVE';
    const mockDfspId = 1;
    sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
    sandbox.stub(knex, 'table').returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          select: sinon.stub().resolves([])
        })
      })
    });

    const result = await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
    expect(result).to.deep.equal([]);
  });

  it('should throw an error if DFSPModel.findIdByDfspId fails', async () => {
    const dfspId = 'dfsp1';
    const state = 'ACTIVE';
    sandbox.stub(DFSPModel, 'findIdByDfspId').rejects(new Error('DFSPModel error'));

    try {
      await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
    } catch (error) {
      expect(error.message).to.equal('DFSPModel error');
    }
  });

  it('should throw an error if knex.table fails', async () => {
    const dfspId = 'dfsp1';
    const state = 'ACTIVE';
    const mockDfspId = 1;
    sandbox.stub(DFSPModel, 'findIdByDfspId').resolves(mockDfspId);
    sandbox.stub(knex, 'table').returns({
      where: sinon.stub().returns({
        where: sinon.stub().returns({
          select: sinon.stub().rejects(new Error('knex error'))
        })
      })
    });

    try {
      await DFSPEndpointItemModel.findAllDfspState(dfspId, state);
    } catch (error) {
      expect(error.message).to.equal('knex error');
    }
  });
});
});