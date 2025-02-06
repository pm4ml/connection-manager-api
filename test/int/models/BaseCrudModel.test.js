const { expect } = require('chai');
const BaseCrudModel = require('../../../src/models/BaseCrudModel');
const { knex } = require('../../../src/db/database');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');
const sinon = require('sinon');

describe('BaseCrudModel', () => {
        const TEST_TABLE = 'test_table';
        let model;

        before(async () => {
            await knex.schema.createTable(TEST_TABLE, (table) => {
                table.increments('id');
                table.string('name');
            });
            model = new BaseCrudModel(TEST_TABLE);
        });

    afterEach(async () => {
        await knex(TEST_TABLE).del();
    });

    after(async () => {
        await knex.schema.dropTable(TEST_TABLE);
    });

    describe('constructor', () => {
        it('should throw error if no base table provided', () => {
            expect(() => new BaseCrudModel()).to.throw(InternalError);
        });

        it('should set the baseTable property if provided', () => {
            const testModel = new BaseCrudModel(TEST_TABLE);
            expect(testModel.baseTable).to.equal(TEST_TABLE);
        });
    });
    describe('findById', () => {
        it('should throw NotFoundError if record not found by id', async () => {
            try {
                await model.findById(999);
                expect.fail('Should have thrown NotFoundError');
            } catch (err) {
                expect(err).to.be.instanceof(NotFoundError);
            }
        });

        it('should throw InternalError if multiple records found by id', async () => {
            const stub = sinon.stub(knex.table(TEST_TABLE), 'where').returns({
                select: () => Promise.resolve([{ id: 1, name: 'test1' }, { id: 1, name: 'test2' }])
            });

            try {
                await model.findById(1);
                expect.fail('Should have thrown InternalError');
            } catch (err) {
                expect(err).to.be.instanceof(InternalError);
            } finally {
                stub.restore();
            }
        });
    });
    describe('create', () => {
        it('should throw InternalError if more than one row created', async () => {
            sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1, 2]);
            try {
                await model.create({ name: 'test' });
                expect.fail('Should have thrown InternalError');
            } catch (err) {
                expect(err).to.be.instanceof(InternalError);
                expect(err.message).to.equal('More than one row created');
            }
            knex.table(TEST_TABLE).insert.restore();
        });
    });

    describe('update', () => {
        it('should throw InternalError if more than one row updated', async () => {
            await knex(TEST_TABLE).insert([{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }]);
            sinon.stub(knex.table(TEST_TABLE), 'where').returns({
                update: sinon.stub().resolves(2)
            });
            try {
                await model.update(1, { name: 'updated' });
                expect.fail('Should have thrown InternalError');
            } catch (err) {
                expect(err).to.be.instanceof(InternalError);
            } finally {
                knex.table(TEST_TABLE).where.restore();
            }
        });
    });
    describe('CRUD operations', () => {
        it('should create and retrieve a record', async () => {
            const created = await model.create({ name: 'test' });
            expect(created).to.have.property('id');
            
            const found = await model.findById(created.id);
            expect(found.name).to.equal('test');
        });

        it('should find all records', async () => {
            await model.create({ name: 'test1' });
            await model.create({ name: 'test2' });
            
            const results = await model.findAll();
            expect(results).to.have.length(2);
        });

        it('should update a record', async () => {
            const created = await model.create({ name: 'test' });
            await model.update(created.id, { name: 'updated' });
            
            const found = await model.findById(created.id);
            expect(found.name).to.equal('updated');
        });

        it('should delete a record', async () => {
            const created = await model.create({ name: 'test' });
            await model.delete(created.id);
            
            try {
                await model.findById(created.id);
                expect.fail('Should have thrown NotFoundError');
            } catch (err) {
                expect(err).to.be.instanceof(NotFoundError);
            }
        });

        it('should upsert - create when id is null', async () => {
            const result = await model.upsert(null, { name: 'test' });
            expect(result).to.have.property('id');
        });

        it('should upsert - update when record exists', async () => {
            const created = await model.create({ name: 'test' });
            await model.upsert(created.id, { name: 'updated' });
            
            const found = await model.findById(created.id);
            expect(found.name).to.equal('updated');
        });

        it('should throw NotFoundError if record not found by id', async () => {
            try {
                await model.findById(999);
                expect.fail('Should have thrown NotFoundError');
            } catch (err) {
                expect(err).to.be.instanceof(NotFoundError);
            }
        });

        it('should throw InternalError if more than one row created', async () => {
            sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1, 2]);
            try {
                await model.create({ name: 'test' });
                expect.fail('Should have thrown InternalError');
            } catch (err) {
                expect(err).to.be.instanceof(InternalError);
                expect(err.message).to.equal('More than one row created');
            }
            knex.table(TEST_TABLE).insert.restore();
        });

        it('should throw InternalError if more than one row updated', async () => {
            await knex(TEST_TABLE).insert([{ id: 1, name: 'test1' }, { id: 2, name: 'test2' }]);
            sinon.stub(knex.table(TEST_TABLE), 'where').returns({
                update: sinon.stub().resolves(2)
            });
            try {
                await model.update(1, { name: 'updated' });
                expect.fail('Should have thrown InternalError');
            } catch (err) {
                expect(err).to.be.instanceof(InternalError);
                expect(err.message).to.equal('More than one row updated');
            }
            knex.table(TEST_TABLE).where.restore();
        });
    });
    describe('BaseCrudModel', () => {
      // existing code...

      describe('create', () => {
        it('should create a single row successfully', async () => {
          const result = await model.create({ name: 'test' });
          expect(result).to.have.property('id');
        });
      });

      describe('delete', () => {
        it('should delete a row successfully', async () => {
          const created = await model.create({ name: 'test' });
          const result = await model.delete(created.id);
          expect(result).to.equal(1);
        });
      });

      describe('update', () => {
        it('should update a row successfully', async () => {
          const created = await model.create({ name: 'test' });
          const result = await model.update(created.id, { name: 'updated' });
          expect(result).to.have.property('id');
        });
      });

      describe('upsert', () => {
        it('should create a row if it does not exist', async () => {
          const result = await model.upsert(null, { name: 'test' });
          expect(result).to.have.property('id');
        });

        it('should update a row if it exists', async () => {
          const created = await model.create({ name: 'test' });
          const result = await model.upsert(created.id, { name: 'updated' });
          expect(result).to.have.property('id');
        });
      });
    });
});
