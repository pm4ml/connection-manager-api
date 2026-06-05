/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/


const { setupTestDB, tearDownTestDB } = require('./test-database');
const AuditService = require('../../src/service/AuditService');
const db = require('../../src/db/database');

describe('AuditService Integration Tests', () => {
  beforeAll(async () => {
    await setupTestDB();
  });

  afterAll(async () => {
    await tearDownTestDB();
  });

  afterEach(async () => {
    await db.knex.table('audit_log').del();
  });

  describe('createAuditEntry', () => {
    it('should insert an audit entry and return an id', async () => {
      const result = await AuditService.createAuditEntry({
        actor: 'user-123',
        action: 'CREATE',
        entityType: 'roles',
        entityId: '1',
        beforeState: null,
        afterState: { name: 'admin' },
      });

      expect(result).toHaveProperty('id');
      expect(typeof result.id).toBe('number');
    });
  });

  describe('getAuditLog', () => {
    beforeEach(async () => {
      await AuditService.createAuditEntry({ actor: 'user-111', action: 'CREATE', entityType: 'roles', entityId: '1', afterState: { name: 'admin' } });
      await AuditService.createAuditEntry({ actor: 'user-222', action: 'UPDATE', entityType: 'roles', entityId: '1', beforeState: { name: 'admin' }, afterState: { name: 'superadmin' } });
      await AuditService.createAuditEntry({ actor: 'user-111', action: 'DELETE', entityType: 'roles', entityId: '2' });
    });

    it('should return all entries when no filters are provided', async () => {
      const entries = await AuditService.getAuditLog();
      expect(entries.length).toBe(3);
    });

    it('should filter by actor', async () => {
      const entries = await AuditService.getAuditLog({ actor: 'user-111' });
      expect(entries.length).toBe(2);
      expect(entries.every((e) => e.actor === 'user-111')).toBe(true);
    });

    it('should filter by action', async () => {
      const entries = await AuditService.getAuditLog({ action: 'UPDATE' });
      expect(entries.length).toBe(1);
      expect(entries[0].action).toBe('UPDATE');
    });

    it('should filter by date range', async () => {
      const from = new Date(Date.now() - 60000).toISOString();
      const to = new Date(Date.now() + 60000).toISOString();
      const entries = await AuditService.getAuditLog({ from, to });
      expect(entries.length).toBe(3);
    });

    it('should return no entries outside the date range', async () => {
      const from = new Date(Date.now() + 60000).toISOString();
      const to = new Date(Date.now() + 120000).toISOString();
      const entries = await AuditService.getAuditLog({ from, to });
      expect(entries.length).toBe(0);
    });

    it('should respect limit and offset', async () => {
      const entries = await AuditService.getAuditLog({ limit: 2, offset: 0 });
      expect(entries.length).toBe(2);

      const nextPage = await AuditService.getAuditLog({ limit: 2, offset: 2 });
      expect(nextPage.length).toBe(1);
    });

    it('should return entries with correct camelCase fields', async () => {
      const entries = await AuditService.getAuditLog({ action: 'UPDATE' });
      const entry = entries[0];

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('createdAt');
      expect(entry).toHaveProperty('actor');
      expect(entry).toHaveProperty('action');
      expect(entry).toHaveProperty('entityType');
      expect(entry).toHaveProperty('entityId');
      expect(entry).toHaveProperty('beforeState');
      expect(entry).toHaveProperty('afterState');
    });

    it('should parse beforeState and afterState as objects', async () => {
      const entries = await AuditService.getAuditLog({ action: 'UPDATE' });
      const entry = entries[0];

      expect(entry.beforeState).toEqual({ name: 'admin' });
      expect(entry.afterState).toEqual({ name: 'superadmin' });
    });
  });
});
