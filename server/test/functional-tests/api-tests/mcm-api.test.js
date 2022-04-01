/**************************************************************************
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
 **************************************************************************/

const { apiHelper } = require("./util/api-helper");
const config = require("./config");
let dfspId;

describe("MCM API Tests", () => {
  
    beforeAll(() => {
        var addDFSPReq = {
            dfspId: dfspId,
            name: 'DFSP 1',
            "monetaryZoneId": "USD"
          }
        var addDFSPResponse = apiHelper.getResponseBody({
            httpMethod: 'POST',
            url: `${config.mcmEndpoint}/dfsps`,
            httpHeaders: {'Content-Type':'application/json'},
            body: JSON.stringify(addDFSPReq)
        });
        dfspId = addDFSPResponse.id;
    });

    describe("DFSP Ingress Endpoint", () => {
    
        test("200 Response Code", async () => {
            const response = await apiHelper.getResponseBody({
                httpMethod: "GET",
                url: `${config.mcmEndpoint}/dfsps/${dfspId}/endpoints/ingress` },
            });

        expect(response.id).not.toBeNull();
        expect(response.dfspId).toBe('1');
        expect(response.state).toBe('NOT_STARTED');
        

    });

    

  });

});
