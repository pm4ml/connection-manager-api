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

const axios = require('axios');

const apiHelper = {

    getResponseBody: async (httpMethod = 'GET', url, body = JSON.stringify({}), httpHeaders) => {
        const response = await apiHelper.sendRequest(httpMethod, url, body, httpHeaders);

        return response.data;
    },

    getResponseStatus: async (httpMethod = 'GET', url, body = JSON.stringify({}), httpHeaders) => {
        const response = await apiHelper.sendRequest(httpMethod, url, body, httpHeaders);

        return response.status;
    },

    getResponseHeaders: async (httpMethod = 'GET', url, body = JSON.stringify({}), httpHeaders) => {
        const response = await apiHelper.sendRequest(httpMethod, url, body, httpHeaders);

        return response.headers;
    },

    sendRequest: async (method = 'POST', url, data, headers) => {
            const options = {
                method: method,
                url: url,
                data: data,
                headers: processHeaders(headers),
                validateStatus: (status) => {
                    return status < 900 // Reject only if the status code is greater than or equal to 900
                  }
            };

            let responseObj;

            try {
                responseObj = await axios(options);
            
                if (responseObj.data) {
                    try {
                        responseObj.data;
                    } catch (err) {
                        if (!err.message.match(/Unexpected token .* in JSON/)) {
                            // if it's not error with parsing json
                            throw err;
                        }
                    }
                }
            } catch(error) {
                throw new Error(error);
                return;
            }

            return responseObj;
    }
};

module.exports = apiHelper;

function processHeaders(rawHeaders) {
    // convert map to object
    let headers = {};

    if (rawHeaders instanceof Map) {
        rawHeaders.forEach((value, key) => {
            headers[key] = value;
        });
    } else {
        headers = rawHeaders;
    }

    return headers;
}


