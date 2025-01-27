const { expect } = require('chai');
const { knex } = require('../../../src/db/database');
const DFSPModel = require('../../../src/models/DFSPModel');
const NotFoundError = require('../../../src/errors/NotFoundError');

// Add these additional test cases within the DFSPModel describe block

describe('findByRawId', () => {
    it('should find DFSP by raw id', async () => {
        const dfsp = {
            dfsp_id: 'dfsp1',
            name: 'Test DFSP'
        };
        await DFSPModel.create(dfsp);
        const created = await DFSPModel.findByDfspId('dfsp1');
        
        const found = await DFSPModel.findByRawId(created.id);
        expect(found.dfsp_id).to.equal(dfsp.dfsp_id);
        expect(found.name).to.equal(dfsp.name);
    });

    it('should throw NotFoundError for non-existent raw id', async () => {
        try {
            await DFSPModel.findByRawId(999);
            expect.fail('Should have thrown error');
        } catch (err) {
            expect(err).to.be.instanceof(NotFoundError);
        }
    });
});

describe('getDfspsByMonetaryZones', () => {
    it('should return DFSPs by monetary zone', async () => {
        const dfsp1 = {
            dfsp_id: 'dfsp1',
            name: 'DFSP 1',
            monetaryZoneId: 'USD'
        };
        const dfsp2 = {
            dfsp_id: 'dfsp2',
            name: 'DFSP 2', 
            monetaryZoneId: 'USD'
        };
        
        await DFSPModel.create(dfsp1);
        await DFSPModel.create(dfsp2);
        
        const dfsps = await DFSPModel.getDfspsByMonetaryZones('USD');
        expect(dfsps).to.have.lengthOf(2);
        expect(dfsps[0].monetaryZoneId).to.equal('USD');
        expect(dfsps[1].monetaryZoneId).to.equal('USD');
    });

    it('should throw NotFoundError when no DFSPs exist for monetary zone', async () => {
        try {
            await DFSPModel.getDfspsByMonetaryZones('EUR');
            expect.fail('Should have thrown error');
        } catch (err) {
            expect(err).to.be.instanceof(NotFoundError); 
        }
    });
});

describe('createFxpSupportedCurrencies', () => {
    it('should handle empty currencies array', async () => {
        const dfsp = {
            dfsp_id: 'dfsp1',
            name: 'Test DFSP'
        };
        await DFSPModel.create(dfsp);
        
        await DFSPModel.createFxpSupportedCurrencies('dfsp1', []);
        const currencies = await DFSPModel.getFxpSupportedCurrencies('dfsp1');
        expect(currencies).to.be.empty;
    });

    it('should handle null currencies parameter', async () => {
        const dfsp = {
            dfsp_id: 'dfsp1', 
            name: 'Test DFSP'
        };
        await DFSPModel.create(dfsp);

        await DFSPModel.createFxpSupportedCurrencies('dfsp1', null);
        const currencies = await DFSPModel.getFxpSupportedCurrencies('dfsp1');
        expect(currencies).to.be.empty;
    });
});

describe('deleteByRawId', () => {
    it('should delete DFSP by raw id', async () => {
        const dfsp = {
            dfsp_id: 'dfsp1',
            name: 'Test DFSP'
        };
        await DFSPModel.create(dfsp);
        const created = await DFSPModel.findByDfspId('dfsp1');
        
        await DFSPModel.deleteByRawId(created.id);
        
        try {
            await DFSPModel.findByRawId(created.id);
            expect.fail('Should have thrown error');
        } catch (err) {
            expect(err).to.be.instanceof(NotFoundError);
        }
    });
});
