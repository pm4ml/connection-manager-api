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

const { createDfspIdValidationMiddleware } = require('../../../src/middleware/DfspIdValidationMiddleware');

describe('DfspIdValidationMiddleware', () => {
  let middleware;
  let req;
  let res;
  let next;

  beforeEach(() => {
    middleware = createDfspIdValidationMiddleware();

    req = {
      headers: {},
      path: ''
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };

    next = jest.fn();
  });

  describe('when x-client-id header is not present', () => {
    it('should skip validation and call next', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = {};

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when path does not contain dfspId', () => {
    it('should skip validation for non-DFSP paths', () => {
      req.path = '/api/health';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should skip validation for /api/dfsps aggregate endpoints', () => {
      req.path = '/api/dfsps/jwscerts';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should skip validation for /api/dfsps/endpoints paths', () => {
      req.path = '/api/dfsps/endpoints/something';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when dfspId matches x-client-id', () => {
    it('should allow the request to proceed', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow requests with nested paths', () => {
      req.path = '/api/dfsps/DFSP1/enrollments/inbound';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });

    it('should allow requests with multiple path parameters', () => {
      req.path = '/api/dfsps/DFSP1/enrollments/outbound/123';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('when dfspId does not match x-client-id', () => {
    it('should return 403 Forbidden', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'x-client-id': 'DFSP2' };

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Requester (DFSP2) does not have access to the path /api/dfsps/DFSP1/ca'
      });
    });

    it('should return 403 for nested paths with mismatch', () => {
      req.path = '/api/dfsps/DFSP1/enrollments/inbound';
      req.headers = { 'x-client-id': 'DFSP3' };

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Requester (DFSP3) does not have access to the path /api/dfsps/DFSP1/enrollments/inbound'
      });
    });

    it('should be case-sensitive in validation', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'x-client-id': 'dfsp1' }; // lowercase

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Forbidden',
        message: 'Requester (dfsp1) does not have access to the path /api/dfsps/DFSP1/ca'
      });
    });
  });

  describe('error handling', () => {
    it('should handle errors gracefully', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'x-client-id': 'DFSP1' };

      // Override path to cause an error
      Object.defineProperty(req, 'path', {
        get: () => { throw new Error('Test error'); }
      });

      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Internal Server Error',
        message: 'Error validating DFSP ID'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle paths with special characters in dfspId', () => {
      req.path = '/api/dfsps/DFSP-1/ca';
      req.headers = { 'x-client-id': 'DFSP-1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle numeric dfspIds', () => {
      req.path = '/api/dfsps/123/ca';
      req.headers = { 'x-client-id': '123' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should handle x-client-id header with different casing', () => {
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'X-Client-Id': 'DFSP1' }; // Different case header

      middleware(req, res, next);

      // Express normalizes headers to lowercase
      expect(next).toHaveBeenCalledWith();
    });
  });

  describe('different HTTP methods', () => {
    it('should validate GET requests', () => {
      req.method = 'GET';
      req.path = '/api/dfsps/DFSP1/ca';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate POST requests', () => {
      req.method = 'POST';
      req.path = '/api/dfsps/DFSP1/enrollments/inbound';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate PUT requests', () => {
      req.method = 'PUT';
      req.path = '/api/dfsps/DFSP1/something';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });

    it('should validate DELETE requests', () => {
      req.method = 'DELETE';
      req.path = '/api/dfsps/DFSP1/enrollments/outbound/123';
      req.headers = { 'x-client-id': 'DFSP1' };

      middleware(req, res, next);

      expect(next).toHaveBeenCalledWith();
    });
  });
});
