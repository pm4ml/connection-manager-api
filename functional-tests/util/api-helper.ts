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

const axios = require('axios').default;
const qs = require('qs');

export type HeaderType = { [key:string]:string; };

export type OauthConfig = {
  url: string,
  clientId: string,
  clientSecret: string
}

export type ApiHelperOptions = {
  oauth?: OauthConfig
}

export enum MethodEnum {
  POST = 'POST',
  GET = 'GET',
  PUT = 'PUT',
  PATCH = 'PATCH',
}

export type RequestConfig = {
  method: MethodEnum,
  url: string,
  body?: string,
  headers?: HeaderType
}

export class ApiHelper {
  private _options: ApiHelperOptions

  constructor (options: ApiHelperOptions) {
    this._options = { ...options };
  }

  async getResponseBody (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.data;
  }

  async getResponseStatus (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.status;
  }

  async getResponseHeaders (config: RequestConfig) {
    const response = await this.sendRequest(config);

    return response?.headers;
  }

  async sendRequest (config: RequestConfig) {
    // let token = null;
    // if (this._options?.oauth != null) {
    //   token = requestToken(this._options?.oauth?.url, this._options?.oauth?.clientId, this._options?.oauth?.clientSecret)
    // }

    const requestOptions = {
      method: config.method,
      url: config.url,
      data: config?.body || '',
      headers: processHeaders(config?.headers),
      validateStatus: (status: number) => {
        return status < 900; // Reject only if the status code is greater than or equal to 900
      }
    };

    let responseObj;

    try {
      responseObj = await axios(requestOptions);
      // TODO: not sure what this is for?
      //   if (responseObj.data) {
      //     try {
      //       return responseObj.data;
      //     } catch (err) {
      //       if (!err.message.match(/Unexpected token .* in JSON/)) {
      //         // if it's not error with parsing json
      //         throw err;
      //       }
      //     }
      //   }
    } catch (error) {
      throw error;
    }

    return responseObj;
  }
};

export default ApiHelper;

const processHeaders = (rawHeaders: HeaderType | undefined) => {
  if (rawHeaders == null) {
    return []
  }
  // convert map to object
  let headers: { [key:string]:string; } = {};

  if (rawHeaders instanceof Map) {
    rawHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else {
    headers = rawHeaders;
  }

  return headers;
};

const requestToken = async (options?: OauthConfig) => {
  if (options == null) {
    return null;
  }
  const data = qs.stringify({
    grant_type: 'client_credentials',
    client_id: options.clientId,
    client_secret: options.clientSecret,
    scope: 'openid'
  });

  const config = {
    method: 'post',
    url: options.url,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    data: data
  };

  try {
    const response = await axios(config);
    return response?.data?.access_token;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
