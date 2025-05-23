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
        //07/02/2025
        it('should throw InternalError if multiple records found by id', async () => {
            // Stub knex to simulate multiple rows for the same ID
            const stub = sinon.stub(knex, 'table').returns({
              where: () => ({
                select: () => Promise.resolve([
                  { id: 1, name: 'test1' },
                  { id: 1, name: 'test2' }
                ])
              })
            });

            try {

              await model.findById(1);

              expect.fail('Should have thrown InternalError');
            } catch (err) {

              expect(err).to.be.instanceof(InternalError);
              expect(err.message).to.equal('E_TOO_MANY_ROWS');
            } finally {

              stub.restore();
            }
          });
          it('should throw InternalError if more than one row created', async () => {

      const stub = sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1, 2]);

      try {
        await model.create({ name: 'test' });
        expect.fail('Should have thrown InternalError');
      } catch (err) {

        expect(err).to.be.instanceof(InternalError);
        expect(err.message).to.equal('More than one row created');
      } finally {
        stub.restore();
      }
     });
     it('should throw InternalError if more than one row created', async () => {

      const stub = sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1, 2]);

      try {
        await model.create({ name: 'test' });
        expect.fail('Should have thrown InternalError');
      } catch (err) {

        expect(err).to.be.instanceof(InternalError);
        expect(err.message).to.equal('More than one row created');
      } finally {
        stub.restore();
      }
    });
    });
    it('should return the inserted ID when one row is created', async () => {

        const stub = sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1]);

        const result = await model.create({ name: 'test' });
        expect(result).to.deep.equal({ id: 1 });

        stub.restore();
      });

      it('should throw InternalError if more than one row is created', async () => {

        const stub = sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([1, 2]);

        let caughtError;

        try {

          await model.create({ name: 'test' });
        } catch (err) {
          caughtError = err;
          console.log('Caught Error:', err);
        }


        expect(caughtError).to.not.be.undefined;


        expect(caughtError).to.be.instanceof(InternalError);

        expect(caughtError.message).to.equal('More than one row created');

        if (caughtError.category) {
          expect(caughtError.category).to.equal('INTERNAL');
        }

        if (caughtError.payload) {
          expect(caughtError.payload.message).to.equal('More than one row created');
        }

        stub.restore();
      });

      it('should throw InternalError if no rows are created (empty result)', async () => {
        const stub = sinon.stub(knex.table(TEST_TABLE), 'insert').resolves([]);

        try {
          await model.create({ name: 'test' });
          expect.fail('Should have thrown InternalError');
        } catch (err) {
          expect(err).to.be.instanceof(InternalError);
          expect(err.message).to.equal('More than one row created');
        }

        stub.restore();
      });

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


        //10/02/2025
        it('should call create() and return new record when no rows exist', async () => {
          sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              select: sinon.stub().resolves([]),
            }),
          });

          const createStub = sinon.stub(model, 'create').resolves({ id: 3 });

          const result = await model.create({ name: 'new record' });

          expect(createStub.calledOnce).to.be.true;
          expect(result).to.deep.equal({ id: 3 });

          createStub.restore();
          sinon.restore();
        });

        it('should throw an error if create() fails', async () => {
          sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              select: sinon.stub().resolves([]),
            }),
          });

          const createStub = sinon.stub(model, 'create').rejects(new Error('DB error'));

          try {
            await model.create({ name: 'fail case' });
            expect.fail('Should have thrown an error');
          } catch (err) {
            expect(err.message).to.equal('DB error');
          }

          createStub.restore();
          sinon.restore();
        });

        it('should update a single record successfully', async () => {
          sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              update: sinon.stub().resolves(1),
            }),
          });

          const result = await model.update(1, { name: 'updated' });

          expect(result).to.deep.equal({ id: 1 });

          sinon.restore();
        });
        it('should throw an error if update() fails', async () => {
          sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              update: sinon.stub().rejects(new Error('DB update error')),
            }),
          });

          try {
            await model.update(1, { name: 'fail case' });
            expect.fail('Should have thrown an error');
          } catch (err) {
            expect(err.message).to.equal('DB update error');
          }

          sinon.restore();
        });



        it('should create a new record if no existing record is found', async () => {
          const stub = sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              select: sinon.stub().resolves([]),
            }),
          });

          const createStub = sinon.stub(model, 'create').resolves({ id: 2 });

          const result = await model.upsert(2, { name: 'new record' });

          expect(createStub.calledOnce).to.be.true;
          expect(createStub.calledWith({ name: 'new record' })).to.be.true;

          expect(result).to.deep.equal({ id: 2 });

          createStub.restore();
          stub.restore();
        });

        it('should throw InternalError when more than one row is found', async () => {
          const stub = sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              select: sinon.stub().resolves([{ id: 1 }, { id: 2 }]),
            }),
          });

          try {
            await model.upsert(1, { name: 'new record' });
            expect.fail('Should have thrown InternalError');
          } catch (err) {
            expect(err).to.be.instanceof(InternalError);
            expect(err.message).to.equal('E_TOO_MANY_ROWS');
          }

          stub.restore();
        });

        it('should throw InternalError when more than one row is updated', async () => {
          const stub = sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              update: sinon.stub().resolves(2),
            }),
          });

          try {
            await model.update(1, { name: 'updated' });
            expect.fail('Should have thrown InternalError');
          } catch (err) {
            expect(err).to.be.instanceof(InternalError);
            expect(err.message).to.equal('More than one row updated');
          }

          stub.restore();
        });

        it('should throw NotFoundError when no rows are updated', async () => {
          const stub = sinon.stub(knex, 'table').returns({
            where: sinon.stub().returns({
              update: sinon.stub().resolves(0),
            }),
          });

          try {
            await model.update(1, { name: 'updated' });
            expect.fail('Should have thrown NotFoundError');
          } catch (err) {
            expect(err).to.be.instanceof(NotFoundError);
            expect(err.message).to.equal('object with id: 1');
          }

          stub.restore();
        });
        it('should throw InternalError when more than one row is created', async () => {
          const stub = sinon.stub(knex, 'table').returns({
            insert: sinon.stub().resolves([1, 2]),
          });

          try {
            await model.create({ name: 'new record' });
            expect.fail('Should have thrown InternalError');
          } catch (err) {
            expect(err).to.be.instanceof(InternalError);
            expect(err.message).to.equal('More than one row created');
          }

          stub.restore();
        });

      });
    });

