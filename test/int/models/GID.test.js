const { knex } = require('../../../src/db/database');

jest.mock('../../../src/db/database', () => ({
  knex: {
    raw: jest.fn()
  }
}));

const GID_PATH = '../../../src/models/GID';

describe('GID', () => {
  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
    delete process.env.TEST;
  });

  describe('createID()', () => {
    it('should return ID from database when not in TEST mode', async () => {
      process.env.TEST = false;
      const expectedId = 42;
      knex.raw.mockResolvedValue([[[{ id: expectedId }]]]);
      const GID = require(GID_PATH);

      const result = await GID.createID();
      expect(result).toBe(expectedId);
      expect(knex.raw).toHaveBeenCalledWith('CALL create_gid');
    });

    it('should handle null/undefined database response', async () => {
      process.env.TEST = false;
      knex.raw.mockResolvedValue(null);
      const GID = require(GID_PATH);

      const result = await GID.createID();
      expect(result).toBeUndefined();
    });

    it('should propagate database errors', async () => {
      process.env.TEST = false;
      const error = new Error('Database error');
      knex.raw.mockImplementation(() => {
        throw error;
      });
      const GID = require(GID_PATH);
      try {
        await GID.createID();
      } catch (e) {
        expect(e).toBe(error);
      }
    });
  });

  describe('TEST mode', () => {
    beforeEach(() => {
      process.env.TEST = true;
    });

    it('should start counter from 1', () => {
      const GID = require(GID_PATH);
      expect(GID.globalId).toBe(1);
    });

    it('should increment counter on each call', async () => {
      const GID = require(GID_PATH);
      const first = await GID.createID();
      const second = await GID.createID();
      const third = await GID.createID();

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(3);
    });

    it('should initialize globalId to 1 in TEST mode', () => {
      const GID = require(GID_PATH);
      expect(GID.globalId).toBe(1);
    });

    it('should increment counter on each call in TEST mode', async () => {
      const GID = require(GID_PATH);
      const first = await GID.createID();
      const second = await GID.createID();
      const third = await GID.createID();

      expect(first).toBe(1);
      expect(second).toBe(2);
      expect(third).toBe(3);
      expect(GID.globalId).toBe(4);
    });

    it('should maintain separate counters for different instances in TEST mode', async () => {
      const GID1 = require(GID_PATH);
      jest.resetModules();
      process.env.TEST = 'true';
      const GID2 = require(GID_PATH);

      const id1 = await GID1.createID();
      const id2 = await GID2.createID();

      expect(id1).toBe(1);
      expect(id2).toBe(1);
    });
  });
});
