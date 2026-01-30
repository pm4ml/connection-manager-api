/*****
 License
 --------------
 Copyright © 2020-2026 Mojaloop Foundation
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

const { setTimeout: sleep } = require('node:timers/promises');
const DfspInboundService = require('#src/service/DfspInboundService');
const DFSPModel = require('#src/models/DFSPModel');
const PkiService = require('#src/service/PkiService');
const Constants = require('#src/constants/Constants');

jest.mock('#src/models/DFSPModel');
jest.mock('#src/service/PkiService');

const createSignedEnrollmentsMock = (length = 1, state = Constants.enrollmentStates.CERT_SIGNED) =>
  Array.from({ length }, (_, i) => ({
    id: i + 1,
    state
  }));

describe('DfspInboundService Tests -->', () => {
  const mockDfspId = 'test-dfsp';
  const mockDbDfspId = 123;

  let mockPkiEngine;
  let ctx;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPkiEngine = {
      getDFSPInboundEnrollments: jest.fn(),
      getDFSPInboundEnrollment: jest.fn(),
      setDFSPInboundEnrollment: jest.fn(),
      deleteDFSPInboundEnrollment: jest.fn(),
      sign: jest.fn(),
      getCertInfo: jest.fn(),
      validateInboundEnrollment: jest.fn()
    };

    ctx = { pkiEngine: mockPkiEngine };

    DFSPModel.findIdByDfspId.mockResolvedValue(mockDbDfspId);
    PkiService.validateDfsp.mockResolvedValue();
  });

  describe('signDFSPInboundEnrollment with pruning', () => {
    const RETENTION_COUNT = Constants.vault.inboundEnrollmentRetentionCount;

    const mockEnrollment = {
      id: 100,
      csr: '-----BEGIN CERTIFICATE REQUEST-----\nMOCK\n-----END CERTIFICATE REQUEST-----',
      state: Constants.enrollmentStates.CSR_LOADED
    };
    const mockCertificate = '-----BEGIN CERTIFICATE-----\nMOCK\n-----END CERTIFICATE-----';
    const mockCertInfo = { subject: 'test' };

    beforeEach(() => {
      mockPkiEngine.getDFSPInboundEnrollment.mockResolvedValue(mockEnrollment);
      mockPkiEngine.sign.mockResolvedValue(mockCertificate);
      mockPkiEngine.getCertInfo.mockReturnValue(mockCertInfo);
      mockPkiEngine.validateInboundEnrollment.mockResolvedValue({
        validations: [],
        validationState: 'VALID'
      });
      mockPkiEngine.setDFSPInboundEnrollment.mockResolvedValue();
      mockPkiEngine.deleteDFSPInboundEnrollment.mockResolvedValue();
    });

    it('should not prune when below retention count', async () => {
      mockPkiEngine.getDFSPInboundEnrollments
        .mockResolvedValue(createSignedEnrollmentsMock(RETENTION_COUNT - 1));

      await DfspInboundService.signDFSPInboundEnrollment(ctx, mockDfspId, 1);
      await sleep(1_000); // wait for fire-and-forget pruning to complete

      expect(mockPkiEngine.deleteDFSPInboundEnrollment).not.toHaveBeenCalled();
    });

    it('should prune oldest CERT_SIGNED when exceeding retention', async () => {
      const extra = 1;
      const enrollments = createSignedEnrollmentsMock(RETENTION_COUNT + extra);
      mockPkiEngine.getDFSPInboundEnrollments.mockResolvedValue(enrollments);

      await DfspInboundService.signDFSPInboundEnrollment(ctx, mockDfspId, 1);
      await sleep(1_000);

      expect(mockPkiEngine.deleteDFSPInboundEnrollment).toHaveBeenCalledTimes(extra);
      expect(mockPkiEngine.deleteDFSPInboundEnrollment).toHaveBeenCalledWith(mockDbDfspId, enrollments[0].id);
    });

    it('should preserve CSR_LOADED enrollment', async () => {
      const loadedId = 0;
      const enrollments = [
        { id: loadedId, state: Constants.enrollmentStates.CSR_LOADED },
        ...createSignedEnrollmentsMock(RETENTION_COUNT + 1)
      ];
      mockPkiEngine.getDFSPInboundEnrollments.mockResolvedValue(enrollments);

      await DfspInboundService.signDFSPInboundEnrollment(ctx, mockDfspId, 100);
      await sleep(1_000);

      expect(mockPkiEngine.deleteDFSPInboundEnrollment).toHaveBeenCalledTimes(1);
      // should not delete any CSR_LOADED enrollments
      expect(mockPkiEngine.deleteDFSPInboundEnrollment.mock.lastCall).not.toContain(loadedId);
    });

    it('should handle empty enrollment list', async () => {
      mockPkiEngine.getDFSPInboundEnrollments.mockResolvedValue([]);

      await DfspInboundService.signDFSPInboundEnrollment(ctx, mockDfspId, 1);
      await sleep(1_000);

      expect(mockPkiEngine.deleteDFSPInboundEnrollment).not.toHaveBeenCalled();
    });

    it('should not throw on pruning failure', async () => {
      mockPkiEngine.deleteDFSPInboundEnrollment.mockRejectedValue(new Error('Vault error'));
      mockPkiEngine.getDFSPInboundEnrollments
        .mockResolvedValue(createSignedEnrollmentsMock(RETENTION_COUNT + 1));

      const result = await DfspInboundService.signDFSPInboundEnrollment(ctx, mockDfspId, 100);
      await sleep(1_000);

      expect(result).toBeDefined();
    });
  });
});
