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

 --------------
 ******/

'use strict';

jest.mock('#src/service/AuditService', () => ({
  getAuditLog: jest.fn()
}));

const AuditController = require('#src/controllers/AuditController');
const AuditService = require('#src/service/AuditService');

describe('AuditController', () => {
  let req;
  let res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = { query: {} };

    res = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis(),
    };
  });

  describe('getAuditLog', () => {
    it('should return audit log entries on success', async () => {
      const mockEntries = [
        { id: 1, actor: 'user-123', action: 'CREATE', entityType: 'roles', entityId: '1' }
      ];
      AuditService.getAuditLog.mockResolvedValue(mockEntries);

      await AuditController.getAuditLog(req, res);

      expect(res.json).toHaveBeenCalledWith(mockEntries);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should pass query filters to the service', async () => {
      AuditService.getAuditLog.mockResolvedValue([]);
      req.query = { from: '2026-01-01', to: '2026-12-31', actor: 'user-123', action: 'CREATE', limit: '50', offset: '10' };

      await AuditController.getAuditLog(req, res);

      expect(AuditService.getAuditLog).toHaveBeenCalledWith({
        from: '2026-01-01',
        to: '2026-12-31',
        actor: 'user-123',
        action: 'CREATE',
        limit: '50',
        offset: '10',
      });
    });

    it('should return 500 when service throws', async () => {
      AuditService.getAuditLog.mockRejectedValue(new Error('DB error'));

      await AuditController.getAuditLog(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({ error: 'Failed to retrieve audit log' });
    });
  });
});
