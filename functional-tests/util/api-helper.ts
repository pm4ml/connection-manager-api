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
 * 
 *  CONTRIBUTORS:                                                      *
 *       Miguel de Barros - miguel.debarros@modusbox.com                **
 * 
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
  DELETE = 'DELETE',
}

export type RequestConfig = {
  method: MethodEnum,
  url: string,
  body?: string,
  headers?: HeaderType
}

export class ApiHelper {
  private _options: ApiHelperOptions
  private _token: string | undefined

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
    if (this._token == null && this._options?.oauth != null) {
      this._token = await requestToken({
        url: this._options?.oauth?.url,
        clientId: this._options?.oauth?.clientId,
        clientSecret: this._options?.oauth?.clientSecret
      })
    }

    const requestOptions = {
      method: config.method,
      url: config.url,
      data: config?.body || '{}',
      headers: processHeaders(config?.headers, this._token),
      validateStatus: (status: number) => {
        return status < 900; // Reject only if the status code is greater than or equal to 900
      }
    };

    let responseObj;

    try {
      // Allow Axios to complete its housekeeping and be ready to track new connections
      await process.nextTick(() => {});
      responseObj = await axios(requestOptions);
    } catch (error) {
      throw error;
    }

    return responseObj;
  }
};

export default ApiHelper;

const processHeaders = (rawHeaders: HeaderType | undefined, bearerToken?: string | undefined): HeaderType => {
  let headers: { [key:string]:string; } = {};

  if (rawHeaders == null) {
    if (bearerToken) {
      headers['Authorization'] = `Bearer ${bearerToken}`
    }
    return headers;
  }

  if (rawHeaders instanceof Map) {
    rawHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else {
    headers = rawHeaders;
  }

  if (bearerToken) {
    headers['Authorization'] = `Bearer ${bearerToken}`
  }

  return headers;
};

const requestToken = async (options?: OauthConfig): Promise<string|undefined> => {
  if (options == null) {
    return;
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
    // Allow Axios to complete its housekeeping and be ready to track new connections
    await process.nextTick(() => {});
    const response = await axios(config);

    if (response?.status != 200) throw new Error('Unable to attain a valid Bearer Token!');
    
    // return a new string
    const token = `${response?.data?.access_token}`;
    return token;
  } catch (error) {
    console.error(error);
    throw error;
  }
};
