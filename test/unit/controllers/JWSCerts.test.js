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

require('../test-env-setup');

const JWSCertsController = require('#src/controllers/JWSCerts');
const utils = require('../../../src/utils/writer.js');
const JWSCertsService = require('../../../src/service/JWSCertsService');

jest.mock('../../../src/utils/writer.js', () => ({
  writeJson: jest.fn()
}));

jest.mock('../../../src/service/JWSCertsService', () => ({
  rotateHubJWSCerts: jest.fn()
}));

describe('JWSCerts Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      context: {
        hubJwsCertManager: {
          renewServerCert: jest.fn()
        }
      }
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('rotateHubJWSCerts', () => {
    test('should call service and return response on success', async () => {
      const mockResponse = { message: 'Hub JWS certificate rotation triggered' };
      JWSCertsService.rotateHubJWSCerts.mockResolvedValue(mockResponse);

      JWSCertsController.rotateHubJWSCerts(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(JWSCertsService.rotateHubJWSCerts).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(mockRes, mockResponse);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should return error in Swagger-compliant format when service fails', async () => {
      const mockError = new Error('Hub JWS CertManager is not configured');
      JWSCertsService.rotateHubJWSCerts.mockRejectedValue(mockError);

      JWSCertsController.rotateHubJWSCerts(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(JWSCertsService.rotateHubJWSCerts).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(
        mockRes,
        { error: 'Hub JWS CertManager is not configured' },
        500
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should use custom status code if provided in error', async () => {
      const mockError = new Error('Certificate renewal failed');
      mockError.status = 503;
      JWSCertsService.rotateHubJWSCerts.mockRejectedValue(mockError);

      JWSCertsController.rotateHubJWSCerts(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(JWSCertsService.rotateHubJWSCerts).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(
        mockRes,
        { error: 'Certificate renewal failed' },
        503
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should handle errors with no message', async () => {
      const mockError = new Error();
      mockError.message = '';
      JWSCertsService.rotateHubJWSCerts.mockRejectedValue(mockError);

      JWSCertsController.rotateHubJWSCerts(mockReq, mockRes, mockNext);

      await new Promise(setImmediate);
      expect(JWSCertsService.rotateHubJWSCerts).toHaveBeenCalledWith(mockReq.context);
      expect(utils.writeJson).toHaveBeenCalledWith(
        mockRes,
        { error: 'An error occurred' },
        500
      );
      expect(mockNext).not.toHaveBeenCalled();
    });
  });
});
