const chai = require('chai');
const sinon = require('sinon');
const { knex } = require('../../../src/db/database');
const HubEndpointItemModel = require('../../../src/models/HubEndpointItemModel');
const NotFoundError = require('../../../src/errors/NotFoundError');
const InternalError = require('../../../src/errors/InternalError');


const { expect } = chai;

describe('HubEndpointItemModel', () => {
    let sandbox;

    beforeEach(() => {
        sandbox = sinon.createSandbox();
    });

    afterEach(() => {
        sandbox.restore();
    });

    describe('findById', () => {
        it('should return the item if found', async () => {
            const id = 1;
            const mockRow = { id, value: '{"ip": "127.0.0.1"}' };
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    select: sandbox.stub().resolves([mockRow])
                })
            });

            const result = await HubEndpointItemModel.findById(id);
            expect(result).to.deep.equal(mockRow);
        });

        it('should throw NotFoundError if no item is found', async () => {
            const id = 1;
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    select: sandbox.stub().resolves([])
                })
            });

            try {
                await HubEndpointItemModel.findById(id);
            } catch (err) {
                expect(err).to.be.instanceOf(NotFoundError);
                expect(err.message).to.equal('Item with id: ' + id);
            }
        });

        it('should throw InternalError if multiple items are found', async () => {
            const id = 1;
            const mockRows = [{ id }, { id }];
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    select: sandbox.stub().resolves(mockRows)
                })
            });

            try {
                await HubEndpointItemModel.findById(id);
            } catch (err) {
                expect(err).to.be.instanceOf(InternalError);
                expect(err.message).to.equal('E_TOO_MANY_ROWS');
            }
        });
    });

    describe('create', () => {
        it('should insert a new record', async () => {
            const values = { state: 'active', type: 'type1', value: '{"ip": "127.0.0.1"}', direction: 'inbound' };
            const insertStub = sandbox.stub(knex, 'table').returns({
                insert: sandbox.stub().resolves([1])
            });

            const result = await HubEndpointItemModel.create(values);
            expect(insertStub.calledOnce).to.be.true;
            expect(result).to.deep.equal([1]);
        });

        it('should throw an error if insert fails', async () => {
            const values = { state: 'active', type: 'type1', value: '{"ip": "127.0.0.1"}', direction: 'inbound' };
            sandbox.stub(knex, 'table').returns({
                insert: sandbox.stub().rejects(new Error('Insert failed'))
            });

            try {
                await HubEndpointItemModel.create(values);
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
                expect(err.message).to.equal('Insert failed');
            }
        });
    });

    describe('delete', () => {
        it('should delete the record with the given id', async () => {
            const id = 1;
            const deleteStub = sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    del: sandbox.stub().resolves(1)
                })
            });

            const result = await HubEndpointItemModel.delete(id);
            expect(deleteStub.calledOnce).to.be.true;
            expect(result).to.equal(1);
        });

        it('should throw an error if delete fails', async () => {
            const id = 1;
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    del: sandbox.stub().resolves(0)
                })
            });

            try {
                await HubEndpointItemModel.delete(id);
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
            }
        });
    });

    describe('update', () => {
        it('should update the record with the given id', async () => {
            const id = 1;
            const endpointItem = { state: 'inactive' };
            const updateStub = sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    update: sandbox.stub().resolves(1)
                })
            });
            sandbox.stub(HubEndpointItemModel, 'findObjectById').resolves(endpointItem);

            const result = await HubEndpointItemModel.update(id, endpointItem);
            expect(updateStub.calledOnce).to.be.true;
            expect(result).to.deep.equal(endpointItem);
        });

        it('should throw an error if update fails', async () => {
            const id = 1;
            const endpointItem = { state: 'inactive' };
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    update: sandbox.stub().resolves(0)
                })
            });

            try {
                await HubEndpointItemModel.update(id, endpointItem);
            } catch (err) {
                expect(err).to.be.instanceOf(Error);
            }
        });
    });

    describe('findObjectById', () => {
        it('should return the parsed object if found', async () => {
            const id = 1;
            const mockRow = { id, value: '{"ip": "127.0.0.1"}' };
            sandbox.stub(HubEndpointItemModel, 'findById').resolves(mockRow);

            const result = await HubEndpointItemModel.findObjectById(id);
            expect(result).to.deep.equal({ id, value: { ip: '127.0.0.1' } });
        });

        it('should throw NotFoundError if no item is found', async () => {
            const id = 1;
            sandbox.stub(HubEndpointItemModel, 'findById').rejects(new NotFoundError('Item with id: ' + id));

            try {
                await HubEndpointItemModel.findObjectById(id);
            } catch (err) {
                expect(err).to.be.instanceOf(NotFoundError);
            }
        });
    });

    describe('findObjectAll', () => {
        it('should return all parsed objects', async () => {
            const mockRows = [
                { id: 1, value: '{"ip": "127.0.0.1"}' },
                { id: 2, value: '{"ip": "192.168.0.1"}' }
            ];
            sandbox.stub(knex, 'table').returns({
                select: sandbox.stub().resolves(mockRows)
            });

            const result = await HubEndpointItemModel.findObjectAll();
            expect(result).to.deep.equal([
                { id: 1, value: { ip: '127.0.0.1' } },
                { id: 2, value: { ip: '192.168.0.1' } }
            ]);
        });
    });

    describe('findObjectByDirectionType', () => {
        it('should return the parsed objects for the given direction and type', async () => {
            const direction = 'inbound';
            const type = 'type1';
            const mockRows = [
                { id: 1, value: '{"ip": "127.0.0.1"}', direction, type },
                { id: 2, value: '{"ip": "192.168.0.1"}', direction, type }
            ];
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    where: sandbox.stub().returns({
                        select: sandbox.stub().resolves(mockRows)
                    })
                })
            });

            const result = await HubEndpointItemModel.findObjectByDirectionType(direction, type);
            expect(result).to.deep.equal([
                { id: 1, value: { ip: '127.0.0.1' }, direction, type },
                { id: 2, value: { ip: '192.168.0.1' }, direction, type }
            ]);
        });

        it('should return an empty array if no items are found', async () => {
            const direction = 'inbound';
            const type = 'type1';
            sandbox.stub(knex, 'table').returns({
                where: sandbox.stub().returns({
                    where: sandbox.stub().returns({
                        select: sandbox.stub().resolves([])
                    })
                })
            });

            const result = await HubEndpointItemModel.findObjectByDirectionType(direction, type);
            expect(result).to.deep.equal([]);
        });
    });
});
      