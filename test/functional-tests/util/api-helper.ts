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

import { CookieJar } from 'tough-cookie';

export type HeaderType = { [key:string]:string; };

export type LoginConfig = {
  username: string,
  password: string,
  baseUrl: string,
  kratosUrl: string
}

export type OAuthConfig = {
  clientId: string,
  clientSecret: string,
  tokenUrl: string
}

export type ApiHelperOptions = {
  login?: LoginConfig,
  oauth?: OAuthConfig
}

export enum MethodEnum {
  POST = 'POST',
  GET = 'GET',
  PUT = 'PUT',
  PATCH = 'PATCH',
  DELETE = 'DELETE',
}

export type RequestConfig = {
  method: MethodEnum | string,
  url: string,
  body?: string,
  headers?: HeaderType
}

export class ApiHelper {
  private _options: ApiHelperOptions
  private _authenticated: boolean = false
  private _accessToken: string | null = null
  private _cookieJar: CookieJar = new CookieJar();

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
    if (!this._authenticated && this._options?.login != null) {
      await performLogin(this._options.login, this._cookieJar);
      this._authenticated = true;
    }

    if (!this._accessToken && this._options?.oauth != null) {
      this._accessToken = await fetchOAuthToken(this._options.oauth);
    }

    const cookies = await this._cookieJar.getCookieString(config.url);
    const headers = processHeaders(config?.headers);
    if (cookies) {
      headers['Cookie'] = cookies;
    }
    if (this._accessToken) {
      headers['Authorization'] = `Bearer ${this._accessToken}`;
    }

    const response = await fetch(config.url, {
      method: config.method,
      headers: headers,
      body: config?.body,
      redirect: 'manual'
    });

    for (const cookie of response.headers.getSetCookie()) {
      await this._cookieJar.setCookie(cookie, config.url);
    }

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      status: response.status,
      data: data,
      headers: Object.fromEntries(response.headers.entries())
    };
  }
};

export default ApiHelper;

const processHeaders = (rawHeaders: HeaderType | undefined): HeaderType => {
  let headers: { [key:string]:string; } = {};

  if (rawHeaders == null) {
    return headers;
  }

  if (rawHeaders instanceof Map) {
    rawHeaders.forEach((value, key) => {
      headers[key] = value;
    });
  } else {
    headers = rawHeaders;
  }

  return headers;
};

// Authenticates against the Kratos browser login flow. On success Kratos sets an
// `ory_kratos_session` cookie scoped to the parent domain (mcm.localhost); that
// cookie is what the Oathkeeper gateway uses to authorize subsequent /api calls.
const performLogin = async (loginConfig: LoginConfig, cookieJar: CookieJar): Promise<void> => {
  try {
    const initUrl = `${loginConfig.kratosUrl}/self-service/login/browser`;

    const initResponse = await fetch(initUrl, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      redirect: 'manual'
    });

    for (const cookie of initResponse.headers.getSetCookie()) {
      await cookieJar.setCookie(cookie, initUrl);
    }

    const flow = await initResponse.json();
    const flowId = flow.id;
    const csrfToken = extractCsrfToken(flow);

    const submitUrl = `${loginConfig.kratosUrl}/self-service/login?flow=${flowId}`;
    const cookies = await cookieJar.getCookieString(submitUrl);

    const submitResponse = await fetch(submitUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Cookie': cookies || ''
      },
      body: JSON.stringify({
        method: 'password',
        identifier: loginConfig.username,
        password: loginConfig.password,
        csrf_token: csrfToken
      }),
      redirect: 'manual'
    });

    for (const cookie of submitResponse.headers.getSetCookie()) {
      await cookieJar.setCookie(cookie, submitUrl);
    }

    if (submitResponse.status !== 200) {
      const errorBody = await submitResponse.text();
      throw new Error(`Kratos login failed (status ${submitResponse.status}): ${errorBody}`);
    }
  } catch (error) {
    console.error('Login failed:', error);
    throw error;
  }
};

// Extracts the csrf_token value from a Kratos flow's UI nodes.
const extractCsrfToken = (flow: any): string => {
  const node = flow?.ui?.nodes?.find(
    (n: any) => n?.attributes?.name === 'csrf_token'
  );
  const value = node?.attributes?.value;
  if (!value) {
    throw new Error('Could not find csrf_token in Kratos flow');
  }
  return value;
};

// Obtains a machine (PM4ML) access token from Hydra via the client_credentials
// grant. The token is then sent as a Bearer token on API calls.
const fetchOAuthToken = async (oauthConfig: OAuthConfig): Promise<string> => {
  try {
    const credentials = Buffer.from(
      `${oauthConfig.clientId}:${oauthConfig.clientSecret}`
    ).toString('base64');

    const formData = new URLSearchParams();
    formData.append('grant_type', 'client_credentials');
    formData.append('audience', 'connection-manager-api');

    const response = await fetch(oauthConfig.tokenUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    const data = await response.json();

    if (!data.access_token) {
      throw new Error(`No access token in response: ${JSON.stringify(data)}`);
    }

    return data.access_token;
  } catch (error) {
    console.error('OAuth token fetch failed:', error);
    throw error;
  }
};
