const { expect } = require('chai');
const BaseCrudModel = require('../../../src/models/BaseCrudModel');
const { knex } = require('../../../src/db/database');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');

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
    });
});