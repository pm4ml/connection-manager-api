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

process.env.PING_PONG_SERVER_URL = 'ping-pong.url';

let mockErrCountInc;
jest.mock('@mojaloop/central-services-metrics', () => ({
  getCounter() {
    return {
      inc: mockErrCountInc,
    };
  }
}));

const axios = require('axios');
const AxiosMockAdapter = require('axios-mock-adapter');
const { createDfspWatcher, DfspWatcher } = require('../../src/dfsp-watcher/index');
const { PingStatus } = require('../../src/dfsp-watcher/constants');

const mockAxios = new AxiosMockAdapter(axios);

const createMockDfspModel = ({
  findWatchedDfspIds = jest.fn().mockResolvedValue([]),
  updatePingStatus = jest.fn().mockResolvedValue(true),
} = {}) => ({
  findWatchedDfspIds,
  updatePingStatus
});

describe('DfspWatcher Tests -->', () => {
  beforeEach(() => {
    mockAxios.reset();
    mockErrCountInc = jest.fn();
  });

  test('should create DfspWatcher instance', () => {
    expect(createDfspWatcher()).toBeInstanceOf(DfspWatcher);
  });

  test('should start watching dfsps', async () => {
    const dfspModel = createMockDfspModel({
      findWatchedDfspIds: jest.fn().mockResolvedValue(['dfsp1', 'dfsp2']),
    });
    mockAxios.onPost()
      .reply(200, { pingStatus: PingStatus.SUCCESS });
    const watcher = createDfspWatcher({ dfspModel });

    await watcher.start();
    await watcher.stopWatching();
    expect(dfspModel.updatePingStatus).toHaveBeenCalledTimes(2);
  });

  test('should ping all watched dfsps', async () => {
    const dfspModel = createMockDfspModel({
      findWatchedDfspIds: jest.fn().mockResolvedValue(['dfsp1', 'dfsp2']),
    });
    mockAxios.onPost()
      .reply(200, { pingStatus: PingStatus.SUCCESS });
    const watcher = createDfspWatcher({ dfspModel });

    await watcher.pingWatchedDfsps();
    expect(dfspModel.updatePingStatus).toHaveBeenCalledTimes(2);
  });

  describe('processOneDfspWatch method Tests', () => {
    test('should update pingStatus e2e flow', async () => {
      const dfspId = 'dfsp1';
      const pingStatus = PingStatus.SUCCESS;
      mockAxios.onPost()
        .reply(200, { pingStatus });
      const dfspModel = createMockDfspModel();
      const watcher = createDfspWatcher({ dfspModel });

      await watcher.processOneDfspPing(dfspId);
      expect(dfspModel.updatePingStatus).toHaveBeenCalledWith(dfspId, pingStatus);
    });

    test('should update pingStatus to PING_ERROR if http errorCode is received', async () => {
      const dfspId = 'dfsp1';
      mockAxios.onPost()
        .reply(500);
      const dfspModel = createMockDfspModel();
      const watcher = createDfspWatcher({ dfspModel });

      await watcher.processOneDfspPing(dfspId);
      expect(dfspModel.updatePingStatus).toHaveBeenCalledWith(dfspId, PingStatus.PING_ERROR);
    });

    test('should update pingStatus to PING_ERROR in case network error', async () => {
      const dfspId = 'dfsp1';
      mockAxios.onPost()
        .networkError();
      const dfspModel = createMockDfspModel();
      const watcher = createDfspWatcher({ dfspModel });

      await watcher.processOneDfspPing(dfspId);
      expect(dfspModel.updatePingStatus).toHaveBeenCalledWith(dfspId, PingStatus.PING_ERROR);
    });

    test('should increment errorCounter if response from ping-pong server is not SUCCESS', async () => {
      mockAxios.onPost()
        .reply(200, { pingStatus: PingStatus.NOT_REACHABLE });
      const dfspModel = createMockDfspModel();
      const watcher = createDfspWatcher({ dfspModel });

      await watcher.processOneDfspPing('dfspId');
      expect(mockErrCountInc).toHaveBeenCalledTimes(1);
    });

    test('should NOT increment errorCounter if response from ping-pong server is SUCCESS', async () => {
      mockAxios.onPost()
        .reply(200, { pingStatus: PingStatus.SUCCESS });
      const dfspModel = createMockDfspModel();
      const watcher = createDfspWatcher({ dfspModel });

      await watcher.processOneDfspPing('dfspId');
      expect(mockErrCountInc).not.toHaveBeenCalled();
    });
  });
});

