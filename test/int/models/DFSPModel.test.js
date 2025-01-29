const { expect } = require("chai");
const { knex } = require("../../../src/db/database");
const DFSPModel = require("../../../src/models/DFSPModel");
const NotFoundError = require("../../../src/errors/NotFoundError");

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

describe("delete by dfspId", () => {
  it("should not throw error when deleting non-existent dfspId", async () => {
    const result = await DFSPModel.delete("nonexistent");
    expect(result).to.equal(0);
  });
});
