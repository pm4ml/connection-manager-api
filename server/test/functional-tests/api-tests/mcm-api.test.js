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
const util = require("util");
const axios = require("axios");
const { isTypedArray } = require("util/types");
const { assert } = require("console");

describe("MCM API Tests", () => {
  
    describe("DFSP Ingress Endpoint", () => {
    
        it("200 Response Code", async () => {
            const response = await apiHelper.getResponseBody({
                httpMethod: "GET",
                url: `config.mcmEndpoint/dfsps/1/endpoints/ingress`,
                httpHeaders: { "Content-Type": "application/json" },
            });

        expect(response.id).not.toEqual(null);
        expect(response.dfspId).toEqual('1');
        expect(response.state).toEqual('NOT_STARTED');
        

    });

  });

});
