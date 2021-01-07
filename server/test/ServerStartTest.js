/******************************************************************************
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
 *  limitations under the License.                                            *
 ******************************************************************************/

const run = require('../src/index.js');
const sinon = require('sinon');
const assert = require('assert');

describe('Server start', () => {
  it('Should call createEnvironment with the correct arguments', () => {
    const createEnvironmentSpy = sinon.spy();
    const constants = {
      ENVIRONMENT_INIT: {
        initEnvironment: true,
        config: 'whatever'
      }
    };
    run({
      constants,
      http: {
        createServer: () => ({
          listen: () => {}
        })
      },
      createEnvironment: createEnvironmentSpy,
      connect: () => {}
    });
    assert(createEnvironmentSpy.calledOnceWith(constants.ENVIRONMENT_INIT.config));
  });
  it('Should initialise in correct order', () => {
    const httpListenSpy = sinon.spy();
    const createEnvironmentSpy = sinon.spy();
    const appLoaderConnectSpy = sinon.spy();
    run({
      http: {
        createServer: () => ({
          listen: httpListenSpy
        })
      },
      constants: {
        ENVIRONMENT_INIT: {
          initEnvironment: true,
          config: 'whatever'
        }
      },
      createEnvironment: createEnvironmentSpy,
      connect: appLoaderConnectSpy
    })
    assert(appLoaderConnectSpy.calledBefore(createEnvironmentSpy));
    assert(createEnvironmentSpy.calledBefore(httpListenSpy));
  });
});
