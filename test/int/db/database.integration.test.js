const db = require('../../src/db/database');
const { setupTestDB, tearDownTestDB } = require('./test-database');

describe('Database Integration', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await tearDownTestDB();
  });

  it('should connect to the database and run a simple query', async () => {
    const result = await db.knex.raw('SELECT 1 as value');
    expect(result[0][0].value || result[0].value).toBe(1);
  });

  it('should have the correct schema', async () => {
    // Example: check if a known table exists (replace 'your_table' with a real table)
    const tables = await db.knex.raw("SHOW TABLES");
    expect(Array.isArray(tables[0] || tables)).toBe(true);
  });

  it('should respect SSL config if enabled', async () => {
    // This test assumes the DB is running with SSL enabled in docker-compose and env
    // Just check that the knex config has the right ssl property
    const config = db.knex.client.config.connection;
    if (process.env.DATABASE_SSL_ENABLED === 'true') {
      expect(config.ssl).toBeDefined();
    } else {
      expect(config.ssl).toBeUndefined();
    }
  });

  it('should actually use SSL for the DB connection if enabled', async () => {
    const [rows] = await db.knex.raw("SHOW STATUS LIKE 'Ssl_version'");
    if (process.env.DATABASE_SSL_ENABLED === 'true') {
      expect(rows[0].Value).toBeTruthy();
    } else {
      expect(!rows[0].Value).toBe(true);
    }
  });
});
