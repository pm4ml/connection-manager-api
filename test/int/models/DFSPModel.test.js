const { expect } = require("chai");
const { knex } = require("../../../src/db/database");
const DFSPModel = require("../../../src/models/DFSPModel");
const NotFoundError = require("../../../src/errors/NotFoundError");
const sinon = require('sinon');
const InternalError = require("../../../src/errors/InternalError");

describe("findByRawId", () => {
  it("should throw NotFoundError for non-existent raw id", async () => {
    try {
      await DFSPModel.findByRawId(999);
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });
});

describe("getDfspsByMonetaryZones", () => {
  it("should throw NotFoundError when no DFSPs exist for monetary zone", async () => {
    try {
      await DFSPModel.getDfspsByMonetaryZones("EUR");
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });
});

describe("update", () => {
  it("should throw NotFoundError when updating non-existent DFSP", async () => {
    try {
      await DFSPModel.update("nonexistent", { name: "New Name" });
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });
});

describe("findByRawId", () => {
  it("should throw NotFoundError for non-existent raw id", async () => {
    try {
      await DFSPModel.findByRawId(999);
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });
});

describe("getDfspsByMonetaryZones", () => {
  it("should throw NotFoundError when no DFSPs exist for monetary zone", async () => {
    try {
      await DFSPModel.getDfspsByMonetaryZones("EUR");
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });
});

describe("update", () => {
  it("should throw NotFoundError when updating non-existent DFSP", async () => {
    try {
      await DFSPModel.update("nonexistent", { name: "New Name" });
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(NotFoundError);
    }
  });

  it("should return updated DFSP object when update is successful", async () => {
    const dfspId = "existent";
    const newDfsp = { name: "Updated Name" };
    const dfsp = { dfsp_id: dfspId, name: "Updated Name", monetaryZoneId: "USD", security_group: "group1" };

    sinon.stub(knex, "table").returns({
      where: () => ({
        update: async () => 1
      })
    });

    sinon.stub(DFSPModel, "findByDfspId").returns(dfsp);

    const result = await DFSPModel.update(dfspId, newDfsp);
    expect(result).to.deep.equal({
      dfspId: dfsp.dfsp_id,
      name: dfsp.name,
      monetaryZoneId: dfsp.monetaryZoneId,
      isProxy: dfsp.isProxy,
      securityGroup: dfsp.security_group
    });

    knex.table.restore();
    DFSPModel.findByDfspId.restore();
  });

  it("should throw InternalError when multiple rows are updated", async () => {
    sinon.stub(knex, "table").returns({
      where: () => ({
        update: async () => 2
      })
    });

    try {
      await DFSPModel.update("existent", { name: "New Name" });
      expect.fail("Should have thrown error");
    } catch (err) {
      expect(err).to.be.instanceof(InternalError);
    }

    knex.table.restore();
  });
});

describe("delete by dfspId", () => {
  it("should not throw error when deleting non-existent dfspId", async () => {
    const result = await DFSPModel.delete("nonexistent");
    const dfspId = "validDfspId";
    const monetaryZoneIds = ["USD", "EUR"];
    
    describe("findByRawId", () => {
      it("should throw NotFoundError for non-existent raw id", async () => {
        try {
          await DFSPModel.findByRawId(999);
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(NotFoundError);
        }
      });
    });

    describe("getDfspsByMonetaryZones", () => {
      it("should throw NotFoundError when no DFSPs exist for monetary zone", async () => {
        try {
          await DFSPModel.getDfspsByMonetaryZones("EUR");
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(NotFoundError);
        }
      });
    });

    describe("update", () => {
      it("should throw NotFoundError when updating non-existent DFSP", async () => {
        try {
          await DFSPModel.update("nonexistent", { name: "New Name" });
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(NotFoundError);
        }
      });

      it("should return updated DFSP object when update is successful", async () => {
        const dfspId = "existent";
        const newDfsp = { name: "Updated Name" };
        const dfsp = { dfsp_id: dfspId, name: "Updated Name", monetaryZoneId: "USD", security_group: "group1" };

        sinon.stub(knex, "table").returns({
          where: () => ({
            update: async () => 1
          })
        });

        sinon.stub(DFSPModel, "findByDfspId").returns(dfsp);

        const result = await DFSPModel.update(dfspId, newDfsp);
        expect(result).to.deep.equal({
          dfspId: dfsp.dfsp_id,
          name: dfsp.name,
          monetaryZoneId: dfsp.monetaryZoneId,
          isProxy: dfsp.isProxy,
          securityGroup: dfsp.security_group
        });

        knex.table.restore();
        DFSPModel.findByDfspId.restore();
      });

      it("should throw InternalError when multiple rows are updated", async () => {
        sinon.stub(knex, "table").returns({
          where: () => ({
            update: async () => 2
          })
        });

        try {
          await DFSPModel.update("existent", { name: "New Name" });
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(InternalError);
        }

        knex.table.restore();
      });
    });

    describe("delete by dfspId", () => {
      it("should not throw error when deleting non-existent dfspId", async () => {
        const result = await DFSPModel.delete("nonexistent");
        expect(result).to.equal(0);
      });
    });

    describe("getFxpSupportedCurrencies", () => {
      it("should return an array of monetaryZoneIds for a valid dfspId", async () => {
        const dfspId = "validDfspId";
        const monetaryZoneIds = ["USD", "EUR"];
        
        // Mock the knex query
        sinon.stub(knex, "table").returns({
          join: () => ({
            where: () => ({
              select: async () => monetaryZoneIds.map((id) => ({ monetaryZoneId: id }))
            })
          })
        });

        const result = await DFSPModel.getFxpSupportedCurrencies(dfspId);
        expect(result).to.deep.equal(monetaryZoneIds);

        // Restore the original function
        knex.table.restore();
      });

      it("should throw NotFoundError if no currencies are found for the given dfspId", async () => {
        const dfspId = "invalidDfspId";

        sinon.stub(knex, "table").returns({
          join: () => ({
            where: () => ({
              select: async () => []
            })
          })
        });

        try {
          await DFSPModel.getFxpSupportedCurrencies(dfspId);
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(NotFoundError);
        }

        knex.table.restore();
      });
    });

    describe("createFxpSupportedCurrencies", () => {
      it("should insert monetaryZoneIds for a valid dfsp_id", async () => {
        const dfsp_id = "validDfspId";
        const monetaryZoneIds = ["USD", "EUR"];
        const dfspId = 1;

        sinon.stub(DFSPModel, "findIdByDfspId").returns(dfspId);
        const insertStub = sinon.stub(knex.table('fxp_supported_currencies'), "insert").returns(Promise.resolve());

        await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);

        expect(insertStub.calledOnce).to.be.true;
        expect(insertStub.calledWith(monetaryZoneIds.map((monetaryZoneId) => ({ dfspId, monetaryZoneId })))).to.be.true;

        DFSPModel.findIdByDfspId.restore();
        insertStub.restore();
      });

      it("should not insert anything if monetaryZoneIds is empty", async () => {
        const dfsp_id = "validDfspId";
        const monetaryZoneIds = [];

        const insertStub = sinon.stub(knex.table('fxp_supported_currencies'), "insert");

        await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);

        expect(insertStub.notCalled).to.be.true;

        insertStub.restore();
      });

      it("should throw an error if findIdByDfspId fails", async () => {
        const dfsp_id = "invalidDfspId";
        const monetaryZoneIds = ["USD", "EUR"];

        sinon.stub(DFSPModel, "findIdByDfspId").throws(new NotFoundError(`dfsp with dfsp_id = ${dfsp_id}`));

        try {
          await DFSPModel.createFxpSupportedCurrencies(dfsp_id, monetaryZoneIds);
          expect.fail("Should have thrown error");
        } catch (err) {
          expect(err).to.be.instanceof(NotFoundError);
        }

        DFSPModel.findIdByDfspId.restore();
      });
    });
        });
      });