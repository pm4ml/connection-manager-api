/**************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
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
