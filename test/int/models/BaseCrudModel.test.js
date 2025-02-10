const { expect } = require("chai");
const sinon = require("sinon");
const BaseCrudModel = require("../../../src/models/BaseCrudModel");
const { knex } = require("../../../src/db/database");
const NotFoundError = require("../../../src/errors/NotFoundError");
const InternalError = require("../../../src/errors/InternalError");

describe("BaseCrudModel", () => {
  const TEST_TABLE = "test_table";
  let model;

  before(async () => {
    await knex.schema.createTable(TEST_TABLE, (table) => {
      table.increments("id");
      table.string("name");
    });
    model = new BaseCrudModel(TEST_TABLE);
  });

  afterEach(async () => {
    await knex(TEST_TABLE).del();
  });

  after(async () => {
    await knex.schema.dropTable(TEST_TABLE);
  });

  describe("constructor", () => {
    it("should throw error if no base table provided", () => {
      expect(() => new BaseCrudModel()).to.throw(InternalError);
    });

    it("should set the baseTable property if provided", () => {
      const testModel = new BaseCrudModel(TEST_TABLE);
      expect(testModel.baseTable).to.equal(TEST_TABLE);
    });
  });

  describe("CRUD operations", () => {
    it("should create and retrieve a record", async () => {
      const created = await model.create({ name: "test" });
      expect(created).to.have.property("id");

      const found = await model.findById(created.id);
      expect(found.name).to.equal("test");
    });

    it("should find all records", async () => {
      await model.create({ name: "test1" });
      await model.create({ name: "test2" });

      const results = await model.findAll();
      expect(results).to.have.length(2);
    });

    it("should update a record", async () => {
      const created = await model.create({ name: "test" });
      await model.update(created.id, { name: "updated" });

      const found = await model.findById(created.id);
      expect(found.name).to.equal("updated");
    });

    it("should delete a record", async () => {
      const created = await model.create({ name: "test" });
      await model.delete(created.id);

      try {
        await model.findById(created.id);
        expect.fail("Should have thrown NotFoundError");
      } catch (err) {
        expect(err).to.be.instanceof(NotFoundError);
      }
    });

    it("should upsert - create when id is null", async () => {
      const result = await model.upsert(null, { name: "test" });
      expect(result).to.have.property("id");
    });

    it("should upsert - update when record exists", async () => {
      const created = await model.create({ name: "test" });
      await model.upsert(created.id, { name: "updated" });

      const found = await model.findById(created.id);
      expect(found.name).to.equal("updated");
    });
  });

  describe("Error handling", () => {
    it("should throw NotFoundError if record not found by id", async () => {
      try {
        await model.findById(999);
        expect.fail("Should have thrown NotFoundError");
      } catch (err) {
        expect(err).to.be.instanceof(NotFoundError);
      }
    });

    it("should throw InternalError if more than one row created", async () => {
      sinon.stub(knex.table(TEST_TABLE), "insert").resolves([1, 2]);
      try {
        await model.create({ name: "test" });
        expect.fail("Should have thrown InternalError");
      } catch (err) {
        expect(err).to.be.instanceof(InternalError);
        expect(err.message).to.equal("More than one row created");
      } finally {
        knex.table(TEST_TABLE).insert.restore();
      }
    });

    it("should throw InternalError if more than one row updated", async () => {
      sinon.stub(knex.table(TEST_TABLE), "where").returns({
        update: sinon.stub().resolves(2),
      });
      try {
        await model.update(1, { name: "updated" });
        expect.fail("Should have thrown InternalError");
      } catch (err) {
        expect(err).to.be.instanceof(InternalError);
        expect(err.message).to.equal("More than one row updated");
      } finally {
        knex.table(TEST_TABLE).where.restore();
      }
    });

    it("should throw InternalError if multiple rows found on upsert", async () => {
      sinon.stub(knex.table(TEST_TABLE), "where").returns({
        select: () => Promise.resolve([{ id: 1 }, { id: 1 }]),
      });
      try {
        await model.upsert(1, { name: "someName" });
        expect.fail("Should have thrown InternalError");
      } catch (err) {
        expect(err).to.be.instanceof(InternalError);
        expect(err.message).to.equal("E_TOO_MANY_ROWS");
      } finally {
        knex.table(TEST_TABLE).where.restore();
      }
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

  describe("Advanced operations and edge cases", () => {
    it("should handle findAll with specific conditions", async () => {
      // Arrange
      await model.create({ name: "test1" });
      await model.create({ name: "test2" });
      await model.create({ name: "test1" });

      // Act
      const results = await model.findAll({ name: "test1" });

      // Assert
      expect(results).to.have.length(2);
      results.forEach(result => {
        expect(result.name).to.equal("test1");
      });
    });

    it("should handle batch creation of records", async () => {
      // Arrange
      const records = [
        { name: "batch1" },
        { name: "batch2" },
        { name: "batch3" }
      ];

      // Act
      const created = await Promise.all(records.map(r => model.create(r)));

      // Assert
      expect(created).to.have.length(3);
      const found = await model.findAll();
      expect(found).to.have.length(3);
      expect(found.map(r => r.name)).to.have.members(["batch1", "batch2", "batch3"]);
    });

    it("should handle transaction rollback on error", async () => {
      // Arrange
      const initialCount = (await model.findAll()).length;
      const stub = sinon.stub(knex.table(TEST_TABLE), "insert")
        .onFirstCall().resolves([1])
        .onSecondCall().rejects(new Error("Database error"));

      try {
        // Act
        await Promise.all([
          model.create({ name: "success" }),
          model.create({ name: "failure" })
        ]);
        expect.fail("Should have thrown an error");
      } catch (err) {
        // Assert
        expect(err.message).to.equal("Database error");
        const finalCount = (await model.findAll()).length;
        expect(finalCount).to.equal(initialCount + 1);
      } finally {
        stub.restore();
      }
    });

    it("should handle null values in updates", async () => {
      // Arrange
      const created = await model.create({ name: "test" });

      // Act
      await model.update(created.id, { name: null });
      const found = await model.findById(created.id);

      // Assert
      expect(found.name).to.be.null;
    });

    it("should handle special characters in string fields", async () => {
      // Arrange
      const specialChars = "test'\"\\%_!@#$^&*()";

      // Act
      const created = await model.create({ name: specialChars });
      const found = await model.findById(created.id);

      // Assert
      expect(found.name).to.equal(specialChars);
    });
  });
});
});
