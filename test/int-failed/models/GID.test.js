const { expect } = require('chai');
const sinon = require('sinon');
const { knex } = require('../../../src/db/database');
const GID = require('../../../src/models/GID');

describe('GID', () => {
  let sandbox;

  beforeEach(() => {
    sandbox = sinon.createSandbox();
  });

  afterEach(() => {
    sandbox.restore();
    delete process.env.TEST;
  });

  describe('createID()', () => {
    it('should return ID from database when not in TEST mode', async () => {
      const expectedId = 42;
      sandbox.stub(knex, 'raw').resolves([[
        [{id: expectedId}]
      ]]);

      const result = await GID.createID();
      expect(result).to.equal(expectedId);
      expect(knex.raw.calledOnceWith('CALL create_gid')).to.be.true;
    });

    it('should handle null/undefined database response', async () => {
      sandbox.stub(knex, 'raw').resolves(null);
      const result = await GID.createID();
      expect(result).to.be.undefined;
    });

    it('should propagate database errors', async () => {
      const error = new Error('Database error');
      sandbox.stub(knex, 'raw').rejects(error);
      
      try {
        await GID.createID();
        expect.fail('Should have thrown error');
      } catch (err) {
        expect(err).to.equal(error);
      }
    });
  });

  describe('TEST mode', () => {
    beforeEach(() => {
      process.env.TEST = 'true';
    });

    it('should start counter from 1', async () => {
      expect(GID.globalId).to.equal(1);
    });

    it('should increment counter on each call', async () => {
      const first = await GID.createID();
      const second = await GID.createID();
      const third = await GID.createID();

      expect(first).to.equal(1);
      expect(second).to.equal(2);
      expect(third).to.equal(3);
    });

    it('should initialize globalId to 1 in TEST mode', () => {
        const GID = require('../../../src/models/GID');
        expect(GID.globalId).to.equal(1);
    });

    it('should increment counter on each call in TEST mode', async () => {
        const GID = require('../../../src/models/GID');
        const first = await GID.createID();
        const second = await GID.createID();
        const third = await GID.createID();

        expect(first).to.equal(1);
        expect(second).to.equal(2);
        expect(third).to.equal(3);
        expect(GID.globalId).to.equal(4); // Verify the internal counter
    });

    it('should maintain separate counters for different instances in TEST mode', async () => {
        const GID1 = require('../../../src/models/GID');
        delete require.cache[require.resolve('../../../src/models/GID')];
        const GID2 = require('../../../src/models/GID');

        const id1 = await GID1.createID();
        const id2 = await GID2.createID();

        expect(id1).to.equal(1);
        expect(id2).to.equal(1);
    });
  });
});