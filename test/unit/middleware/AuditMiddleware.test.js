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

jest.mock('#src/service/AuditService', () => ({
  createAuditEntry: jest.fn().mockResolvedValue({ id: 1 })
}));

const { createAuditMiddleware } = require('#src/middleware/AuditMiddleware');
const AuditService = require('#src/service/AuditService');

describe('AuditMiddleware', () => {
  let middleware;
  let req;
  let res;
  let next;

  beforeEach(() => {
    jest.clearAllMocks();
    middleware = createAuditMiddleware();

    req = {
      method: 'POST',
      path: '/roles',
      user: { id: 'user-123' },
      body: {}
    };

    res = {
      statusCode: 200,
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('method filtering', () => {
    it('should skip non-audited methods and call next', async () => {
      req.method = 'OPTIONS';
      req.path = '/roles';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(AuditService.createAuditEntry).not.toHaveBeenCalled();
    });
  });

  describe('path filtering', () => {
    it('should skip non-IAM paths and call next', async () => {
      req.method = 'POST';
      req.path = '/dfsps/DFSP1/ca';

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(AuditService.createAuditEntry).not.toHaveBeenCalled();
    });

    it.each(['roles', 'permissions', 'members', 'membership', 'users', 'groups'])(
      'should audit IAM path /%s',
      async (iamPath) => {
        req.path = `/${iamPath}`;

        await middleware(req, res, next);
        res.json({ id: 1 });

        expect(AuditService.createAuditEntry).toHaveBeenCalled();
      }
    );
  });

  describe('action mapping', () => {
    it.each([
      ['GET', 'READ'],
      ['POST', 'CREATE'],
      ['PUT', 'UPDATE'],
      ['PATCH', 'UPDATE'],
      ['DELETE', 'DELETE'],
    ])('should map %s to action %s', async (method, expectedAction) => {
      req.method = method;
      req.path = '/roles';

      await middleware(req, res, next);
      res.json({ id: 1 });

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ action: expectedAction })
      );
    });
  });

  describe('actor extraction', () => {
    it('should extract actor from req.user.id', async () => {
      req.user = { id: 'user-abc' };

      await middleware(req, res, next);
      res.json({});

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ actor: 'user-abc' })
      );
    });

    it('should set actor to null when req.user is not set', async () => {
      req.user = null;

      await middleware(req, res, next);
      res.json({});

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ actor: null })
      );
    });
  });

  describe('entity extraction', () => {
    it('should extract entityType and entityId from path', async () => {
      req.path = '/roles/123';

      await middleware(req, res, next);
      res.json({});

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'roles', entityId: '123' })
      );
    });

    it('should set entityId to null when path has no id segment', async () => {
      req.path = '/roles';

      await middleware(req, res, next);
      res.json({});

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ entityType: 'roles', entityId: null })
      );
    });
  });

  describe('beforeState and afterState', () => {
    it('should set beforeState to null for CREATE actions', async () => {
      req.method = 'POST';
      req.body = { name: 'admin' };

      await middleware(req, res, next);
      res.json({ id: 1, name: 'admin' });

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ beforeState: null })
      );
    });

    it('should capture req.body as beforeState for UPDATE actions', async () => {
      req.method = 'PUT';
      req.body = { name: 'admin' };

      await middleware(req, res, next);
      res.json({ id: 1, name: 'admin' });

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ beforeState: { name: 'admin' } })
      );
    });

    it('should capture response body as afterState on success', async () => {
      res.statusCode = 200;

      await middleware(req, res, next);
      res.json({ id: 1 });

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ afterState: { id: 1 } })
      );
    });

    it('should set afterState to null on error response', async () => {
      res.statusCode = 400;

      await middleware(req, res, next);
      res.json({ error: 'Bad Request' });

      expect(AuditService.createAuditEntry).toHaveBeenCalledWith(
        expect.objectContaining({ afterState: null })
      );
    });
  });

  describe('error handling', () => {
    it('should call next(error) when middleware throws', async () => {
      Object.defineProperty(req, 'method', {
        get: () => { throw new Error('Test error'); }
      });

      await middleware(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
