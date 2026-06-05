/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation
 * decker757

 --------------
 ******/

'use strict';

jest.mock('#src/db/database', () => ({
  executeWithErrorCount: jest.fn()
}));

const AuditModel = require('#src/models/AuditModel');
const mockDb = require('#src/db/database');

describe('AuditModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should insert a row and return the id', async () => {
      mockDb.executeWithErrorCount.mockResolvedValue([42]);

      const result = await AuditModel.create({
        actor: 'user-123',
        action: 'CREATE',
        entityType: 'roles',
        entityId: '1',
        beforeState: null,
        afterState: { id: 1, name: 'admin' },
      });

      expect(result).toEqual({ id: 42 });
      expect(mockDb.executeWithErrorCount).toHaveBeenCalledWith(
        expect.any(Function),
        'createAuditEntry'
      );
    });

    it('should JSON.stringify beforeState and afterState', async () => {
      let capturedRow;
      mockDb.executeWithErrorCount.mockImplementation(async (queryFn) => {
        const knex = {
          table: () => ({
            insert: (row) => { capturedRow = row; return [1]; }
          })
        };
        return queryFn(knex);
      });

      await AuditModel.create({
        actor: 'user-123',
        action: 'UPDATE',
        entityType: 'roles',
        entityId: '1',
        beforeState: { name: 'old' },
        afterState: { name: 'new' },
      });

      expect(capturedRow.before_state).toBe(JSON.stringify({ name: 'old' }));
      expect(capturedRow.after_state).toBe(JSON.stringify({ name: 'new' }));
    });

    it('should use current date when createdAt is not provided', async () => {
      let capturedRow;
      mockDb.executeWithErrorCount.mockImplementation(async (queryFn) => {
        const knex = {
          table: () => ({
            insert: (row) => { capturedRow = row; return [1]; }
          })
        };
        return queryFn(knex);
      });
      const before = new Date();

      await AuditModel.create({ action: 'CREATE' });

      expect(capturedRow.created_at).toBeInstanceOf(Date);
      expect(capturedRow.created_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });
  });

  describe('findAll', () => {
    const mockRows = [
      {
        id: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        actor: 'user-123',
        action: 'CREATE',
        entity_type: 'roles',
        entity_id: '42',
        before_state: null,
        after_state: { name: 'admin' },
      }
    ];

    it('should return mapped rows with camelCase fields', async () => {
      mockDb.executeWithErrorCount.mockResolvedValue(mockRows);

      const result = await AuditModel.findAll();

      expect(result).toEqual([{
        id: 1,
        createdAt: mockRows[0].created_at,
        actor: 'user-123',
        action: 'CREATE',
        entityType: 'roles',
        entityId: '42',
        beforeState: null,
        afterState: { name: 'admin' },
      }]);
    });

    it('should return an empty array when there are no rows', async () => {
      mockDb.executeWithErrorCount.mockResolvedValue([]);

      const result = await AuditModel.findAll();

      expect(result).toEqual([]);
    });

    it('should pass filters to the query', async () => {
      mockDb.executeWithErrorCount.mockResolvedValue([]);

      await AuditModel.findAll({ from: '2026-01-01', to: '2026-12-31', actor: 'user-123', action: 'CREATE' });

      expect(mockDb.executeWithErrorCount).toHaveBeenCalledWith(
        expect.any(Function),
        'findAuditLog'
      );
    });
  });
});
