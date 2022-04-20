/** ************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Sridevi Miriyala - sridevi.miriyala@modusbox.com                **
 ************************************************************************* */

jest.setTimeout(999999)

const { ApiHelper, MethodEnum, ApiHelperOptions } = require('../util/api-helper');
const Config = require('../util/config');

const dfspObject = {
  dfspId: 'test2117',
  name: 'test2117',
  monetaryZoneId: 'XTS'
}

let dfspId: string;

describe('MCM API Tests', () => {
  const apiHelperOptions: typeof ApiHelperOptions = {};
  if (Config.oauth2Issuer && Config.oauthClientKey && Config.oauthClientSecret){
    apiHelperOptions.oauth = {
      url: Config.oauth2Issuer,
      clientId: Config.oauthClientKey,
      clientSecret: Config.oauthClientSecret,
    }
  }
  const apiHelper = new ApiHelper(apiHelperOptions);

  beforeAll(async () => {
    const addDFSPReq = {
      dfspId,
      name: 'DFSP 1',
      monetaryZoneId: 'USD',
    };
    const addDFSPResponse = await apiHelper.getResponseBody({
      method: MethodEnum.POST,
      url:`${Config.mcmEndpoint}/dfsps`,
      body: JSON.stringify(dfspObject),
      headers: { 
        'Content-Type': 'application/json'
      }
    });
    dfspId = addDFSPResponse.id;
  });

  describe('DFSP Ingress Endpoint', () => {
    test('200 Response Code', async () => {
      const response = await apiHelper.getResponseBody({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
      });
    });
    // expect(response.id).not.toBeNull();
    // expect(response.dfspId).toBe('1');
    // expect(response.state).toBe('NOT_STARTED');
  });
});
