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

describe('MCM API Tests', () => {
  let dfspId: string;

  const dfspObject = {
    dfspId: 'test2113',
    name: 'test2113',
    monetaryZoneId: 'XTS'
  }

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

    // lets see if the DFSP already exists
    const getDFSPResponse = await apiHelper.sendRequest({
      method: MethodEnum.GET,
      url:`${Config.mcmEndpoint}/dfsps`,
      headers: { 
        'Content-Type': 'application/json'
      }
    });

    if (getDFSPResponse.status == 200) {
      // filter results
      const result = getDFSPResponse?.data.filter( (dfspRecord: any) => {
        return dfspRecord.id === dfspObject.dfspId
      })
      // if we find it, set the dfspId value
      if (result?.length === 1) dfspId = result[0]?.id
    }
    
    // if not found, we should create it
    if (dfspId == null) {
      const addDFSPResponse = await apiHelper.getResponseBody({
        method: MethodEnum.POST,
        url:`${Config.mcmEndpoint}/dfsps`,
        body: JSON.stringify(dfspObject),
        headers: { 
          'Content-Type': 'application/json'
        }
      });
      // set the dfspId value
      dfspId = addDFSPResponse.id;
    }
  });

  afterEach(() => {
    // TODO: cleanup test-data
  })
  

  describe('DFSP Ingress Endpoint', () => {
    test('200 Response Code', async () => {
      const response = await apiHelper.getResponseBody({
        method: 'GET',
        url: `${Config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress`,
      });
      // expect(response.status).toBe(200);
    });
    // expect(response.id).not.toBeNull();
    // expect(response.dfspId).toBe('1');
    // expect(response.state).toBe('NOT_STARTED');
  });
});
