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
 * Eugen Klymniuk <eugen.klymniuk@infitx.com>

 --------------
 ******/

const DfspNetworkConfigController = require('../../../src/controllers/DfspNetworkConfig');
const utils = require('../../../src/utils/writer.js');

jest.mock('../../../src/utils/writer.js', () => ({
  writeJson: jest.fn()
}));

describe('DfspNetworkConfig Controller Unit Tests', () => {
  let mockReq, mockRes, mockNext;

  beforeEach(() => {
    mockReq = {
      context: {
        pkiEngine: {},
        certManager: {}
      }
    };
    mockRes = {};
    mockNext = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleGetDfspsStatesStatus', () => {
    test('should not call next function for successful response', () => {
      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);
      expect(mockNext).not.toHaveBeenCalled();
    });

    test('should call utils.writeJson with response only (no status code)', () => {
      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);
      expect(utils.writeJson).toHaveBeenCalledWith(mockRes, expect.any(Object));
      // Verify no status code was passed
      const callArgs = utils.writeJson.mock.calls[0];
      expect(callArgs.length).toBe(2); // res and response data only
    });

    test('should return mock response with correct structure', () => {
      DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);

      expect(utils.writeJson).toHaveBeenCalledTimes(1);
      const [res, responseData] = utils.writeJson.mock.calls[0];
      expect(responseData).toBeDefined();
      expect(responseData).toHaveProperty('dfsps');
      expect(Array.isArray(responseData.dfsps)).toBe(true);
      expect(responseData.dfsps.length).toBeGreaterThan(0);
    });

    // test('should include DFSP with null statesStatus', () => {
    //   // Execute the controller method
    //   DfspNetworkConfigController.handleGetDfspsStatesStatus(mockReq, mockRes, mockNext);
    //
    //   // Get the response data
    //   const [res, responseData] = utils.writeJson.mock.calls[0];
    //
    //   // Find a DFSP with null statesStatus
    //   const dfspWithNullStates = responseData.dfsps.find(dfsp => dfsp.statesStatus === null);
    //   expect(dfspWithNullStates).toBeDefined();
    //   expect(dfspWithNullStates.statesStatus).toBeNull();
    // });
  });
});
