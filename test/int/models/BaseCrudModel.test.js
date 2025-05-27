const BaseCrudModel = require('../../../src/models/BaseCrudModel');
const { knex } = require('../../../src/db/database');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');

describe('BaseCrudModel', () => {
  const TEST_TABLE = 'test_table';
  let model;

  beforeAll(async () => {
    try {
      await knex.schema.createTable(TEST_TABLE, (table) => {
        table.increments('id');
        table.string('name');
      });
    } catch (error) {
      // If the table already exists, we can ignore the error
    }
    model = new BaseCrudModel(TEST_TABLE);
  });

  afterEach(async () => {
    await knex(TEST_TABLE).del();
    jest.restoreAllMocks();
  });

  afterAll(async () => {
    await knex.schema.dropTable(TEST_TABLE);
    await knex.destroy();
  });

  describe('constructor', () => {
    it('should throw error if no base table provided', () => {
      expect(() => new BaseCrudModel()).toThrow(InternalError);
    });

    it('should set the baseTable property if provided', () => {
      const testModel = new BaseCrudModel(TEST_TABLE);
      expect(testModel.baseTable).toEqual(TEST_TABLE);
    });
  });

  describe('findById', () => {
    it('should throw NotFoundError if record not found by id', async () => {
      await expect(model.findById(999)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw InternalError if multiple records found by id', async () => {
      const whereMock = jest.fn().mockReturnValue({
        select: jest.fn().mockResolvedValue([{ id: 1, name: 'test1' }, { id: 1, name: 'test2' }])
      });
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({ where: whereMock });

      await expect(model.findById(1)).rejects.toBeInstanceOf(InternalError);

      tableMock.mockRestore();
    });
  });

  describe('create', () => {
    it('should throw InternalError if more than one row created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2])
      });
      await expect(model.create({ name: 'test' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });
  });

  describe('update', () => {
    it('should throw InternalError if more than one row updated', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(2)
        })
      });
      await expect(model.update(1, { name: 'updated' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });
  });

  describe('CRUD operations', () => {
    it('should create and retrieve a record', async () => {
      const created = await model.create({ name: 'test' });
      expect(created).toHaveProperty('id');

      const found = await model.findById(created.id);
      expect(found.name).toEqual('test');
    });

    it('should find all records', async () => {
      await model.create({ name: 'test1' });
      await model.create({ name: 'test2' });

      const results = await model.findAll();
      expect(results).toHaveLength(2);
    });

    it('should update a record', async () => {
      const created = await model.create({ name: 'test' });
      await model.update(created.id, { name: 'updated' });

      const found = await model.findById(created.id);
      expect(found.name).toEqual('updated');
    });

    it('should delete a record', async () => {
      const created = await model.create({ name: 'test' });
      await model.delete(created.id);

      await expect(model.findById(created.id)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should upsert - create when id is null', async () => {
      const result = await model.upsert(null, { name: 'test' });
      expect(result).toHaveProperty('id');
    });

    it('should upsert - update when record exists', async () => {
      const created = await model.create({ name: 'test' });
      await model.upsert(created.id, { name: 'updated' });

      const found = await model.findById(created.id);
      expect(found.name).toEqual('updated');
    });

    it('should throw NotFoundError if record not found by id', async () => {
      await expect(model.findById(999)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should throw InternalError if more than one row created', async () => {
      const insertMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2])
      });
      await expect(model.create({ name: 'test' })).rejects.toBeInstanceOf(InternalError);
      insertMock.mockRestore();
    });

    it('should throw InternalError if more than one row updated', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
      where: jest.fn().mockReturnValue({
        update: jest.fn().mockResolvedValue(2)
      })
      });
      await expect(model.update(1, { name: 'updated' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });

    it('should throw InternalError if multiple records found by id', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: () => ({
          select: () => Promise.resolve([
            { id: 1, name: 'test1' },
            { id: 1, name: 'test2' }
          ])
        })
      });

      await expect(model.findById(1)).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });

    it('should throw InternalError if more than one row created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2])
      });
      await expect(model.create({ name: 'test' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });

    it('should throw InternalError if more than one row created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2])
      });
      await expect(model.create({ name: 'test' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });
  });

  describe('miscellaneous', () => {
    it('should return the inserted ID when one row is created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
      insert: jest.fn().mockResolvedValue([1])
      });
      const result = await model.create({ name: 'test' });
      expect(result).toEqual({ id: 1 });
      tableMock.mockRestore();
    });

    it('should throw InternalError if more than one row is created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2])
      });
      let caughtError;
      try {
        await model.create({ name: 'test' });
      } catch (err) {
        caughtError = err;
      }
      expect(caughtError).not.toBeUndefined();
      expect(caughtError).toBeInstanceOf(InternalError);
      expect(caughtError.message).toEqual('More than one row created');
      if (caughtError.category) {
        expect(caughtError.category).toEqual('Internal');
      }
      if (caughtError.payload) {
        expect(caughtError.payload.message).toEqual('More than one row created');
      }
      tableMock.mockRestore();
    });

    it('should throw InternalError if no rows are created (empty result)', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([])
      });
      await expect(model.create({ name: 'test' })).rejects.toBeInstanceOf(InternalError);
      tableMock.mockRestore();
    });
  });


  describe('create', () => {
    it('should create a single row successfully', async () => {
      const result = await model.create({ name: 'test' });
      expect(result).toHaveProperty('id');
    });
  });

  describe('delete', () => {
    it('should delete a row successfully', async () => {
      const created = await model.create({ name: 'test' });
      const result = await model.delete(created.id);
      expect(result).toEqual(1);
    });
  });

  describe('update', () => {
    it('should update a row successfully', async () => {
      const created = await model.create({ name: 'test' });
      const result = await model.update(created.id, { name: 'updated' });
      expect(result).toHaveProperty('id');
    });
  });

  describe('upsert', () => {
    it('should create a row if it does not exist', async () => {
      const result = await model.upsert(null, { name: 'test' });
      expect(result).toHaveProperty('id');
    });

    it('should update a row if it exists', async () => {
      const created = await model.create({ name: 'test' });
      const result = await model.upsert(created.id, { name: 'updated' });
      expect(result).toHaveProperty('id');
    });

    it('should call create() and return new record when no rows exist', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      });
      const createMock = jest.spyOn(model, 'create').mockResolvedValue({ id: 3 });

      const result = await model.create({ name: 'new record' });

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 3 });

      createMock.mockRestore();
      tableMock.mockRestore();
    });

    it('should throw an error if create() fails', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      });
      const createMock = jest.spyOn(model, 'create').mockRejectedValue(new Error('DB error'));

      await expect(model.create({ name: 'fail case' })).rejects.toThrow('DB error');

      createMock.mockRestore();
      tableMock.mockRestore();
    });

    it('should update a single record successfully', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(1),
        }),
      });

      const result = await model.update(1, { name: 'updated' });

      expect(result).toEqual({ id: 1 });

      tableMock.mockRestore();
    });

    it('should throw an error if update() fails', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockRejectedValue(new Error('DB update error')),
        }),
      });

      await expect(model.update(1, { name: 'fail case' })).rejects.toThrow('DB update error');

      tableMock.mockRestore();
    });

    it('should create a new record if no existing record is found', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([]),
        }),
      });

      const createMock = jest.spyOn(model, 'create').mockResolvedValue({ id: 2 });

      const result = await model.upsert(2, { name: 'new record' });

      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith({ name: 'new record' });
      expect(result).toEqual({ id: 2 });

      createMock.mockRestore();
      tableMock.mockRestore();
    });

    it('should throw InternalError when more than one row is found', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          select: jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }]),
        }),
      });

      await expect(model.upsert(1, { name: 'new record' })).rejects.toThrow('E_TOO_MANY_ROWS');

      tableMock.mockRestore();
    });

    it('should throw InternalError when more than one row is updated', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(2),
        }),
      });

      await expect(model.update(1, { name: 'updated' })).rejects.toThrow('More than one row updated');

      tableMock.mockRestore();
    });

    it('should throw NotFoundError when no rows are updated', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        where: jest.fn().mockReturnValue({
          update: jest.fn().mockResolvedValue(0),
        }),
      });

      await expect(model.update(1, { name: 'updated' })).rejects.toThrow('object with id: 1');

      tableMock.mockRestore();
    });

    it('should throw InternalError when more than one row is created', async () => {
      const tableMock = jest.spyOn(knex, 'table').mockReturnValue({
        insert: jest.fn().mockResolvedValue([1, 2]),
      });

      await expect(model.create({ name: 'new record' })).rejects.toThrow('More than one row created');

      tableMock.mockRestore();
    });
  });
});
