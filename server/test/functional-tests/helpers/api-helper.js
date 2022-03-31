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


