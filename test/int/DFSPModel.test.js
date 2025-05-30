const DFSPModel = require('../../src/models/DFSPModel');
const NotFoundError = require('../../src/errors/NotFoundError');
const InternalError = require('../../src/errors/InternalError');
const knex = require('../../src/db/database').knex;

jest.mock('../../src/db/database', () => ({
  knex: {
    table: jest.fn()
  }
}));

describe('DFSPModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks && jest.restoreAllMocks();
  });

  describe('findByDfspId', () => {
    it('should return dfsp when found', async () => {
      const dfspId = 'test-dfsp-id';
      const dfsp = { id: 1, dfsp_id: dfspId };
      const selectMock = jest.fn().mockResolvedValue([dfsp]);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      knex.table.mockReturnValue({ where: whereMock });

      const result = await DFSPModel.findByDfspId(dfspId);
      expect(result).toEqual(dfsp);
    });

    it('should throw NotFoundError when dfsp not found', async () => {
      const dfspId = 'test-dfsp-id';
      const selectMock = jest.fn().mockResolvedValue([]);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      knex.table.mockReturnValue({ where: whereMock });

      await expect(DFSPModel.findByDfspId(dfspId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw InternalError when multiple dfsps found', async () => {
      const dfspId = 'test-dfsp-id';
      const dfsp = { id: 1, dfsp_id: dfspId };
      const selectMock = jest.fn().mockResolvedValue([dfsp, dfsp]);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      knex.table.mockReturnValue({ where: whereMock });

      await expect(DFSPModel.findByDfspId(dfspId)).rejects.toBeInstanceOf(InternalError);
    });
  });

  describe('getDfspsByMonetaryZones', () => {
    it('should return dfsps when found', async () => {
      const monetaryZoneId = 'test-zone-id';
      const dfsps = [{ id: 1, monetaryZoneId }];
      const selectMock = jest.fn().mockResolvedValue(dfsps);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      knex.table.mockReturnValue({ where: whereMock });

      const result = await DFSPModel.getDfspsByMonetaryZones(monetaryZoneId);
      expect(result).toEqual(dfsps);
    });

    it('should throw NotFoundError when dfsps not found', async () => {
      const monetaryZoneId = 'test-zone-id';
      const selectMock = jest.fn().mockResolvedValue([]);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      knex.table.mockReturnValue({ where: whereMock });

      await expect(DFSPModel.getDfspsByMonetaryZones(monetaryZoneId)).rejects.toBeInstanceOf(NotFoundError);
    });
  });

  describe('getFxpSupportedCurrencies', () => {
    it('should return supported currencies', async () => {
      const dfspId = 'test-dfsp-id';
      const currencies = [{ monetaryZoneId: 'zone1' }, { monetaryZoneId: 'zone2' }];
      const selectMock = jest.fn().mockResolvedValue(currencies);
      const whereMock = jest.fn().mockReturnValue({ select: selectMock });
      const joinMock = jest.fn().mockReturnValue({ where: whereMock });
      knex.table.mockReturnValue({ join: joinMock });

      const result = await DFSPModel.getFxpSupportedCurrencies(dfspId);
      expect(result).toEqual(['zone1', 'zone2']);
    });
  });

  describe('createFxpSupportedCurrencies', () => {
    it('should insert fxp supported currencies when monetaryZoneIds are provided', async () => {
      const dfsp_id = 'test-dfsp-id';
      const monetaryZoneIds = ['zone1', 'zone2'];
      const dfsp = { id: 1, dfsp_id };
      jest.spyOn(DFSPModel, 'findIdByDfspId').mockResolvedValue(dfsp.id);
      const insertMock = jest.fn().mockResolvedValue();
      knex.table.mockReturnValue({ insert: insertMock });

      await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);
      expect(knex.table).toHaveBeenCalledWith('fxp_supported_currencies');
      expect(insertMock).toHaveBeenCalledWith([
        { dfspId: dfsp.id, monetaryZoneId: 'zone1' },
        { dfspId: dfsp.id, monetaryZoneId: 'zone2' }
      ]);
    });

    it('should not insert fxp supported currencies when monetaryZoneIds are not provided', async () => {
      const dfsp_id = 'test-dfsp-id';
      const monetaryZoneIds = [];
      knex.table.mockClear();

      await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);
      expect(knex.table).not.toHaveBeenCalled();
    });
  });

  describe('deleteByRawId', () => {
    it('should delete dfsp by raw id', async () => {
      const id = 1;
      const delMock = jest.fn().mockResolvedValue(1);
      const whereMock = jest.fn().mockReturnValue({ del: delMock });
      knex.table.mockReturnValue({ where: whereMock });

      const result = await DFSPModel.deleteByRawId(id);
      expect(knex.table).toHaveBeenCalledWith('dfsps');
      expect(whereMock).toHaveBeenCalledWith({ id });
      expect(result).toBe(1);
    });
  });
});
