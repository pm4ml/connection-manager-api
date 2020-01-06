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

const { validateCfsslVersion } = require('../src/utils/cfssl');

const assert = require('chai').assert;

describe('CfsslVersionValidatorTest', () => {
  before(async () => {
  });

  after(async () => {
  });

  it('validates that the correct version of CFSSL is installed', async () => {
    try {
      const result = await validateCfsslVersion();
      assert.isTrue(result);
    } catch (error) {
      assert.fail('', '', `Error while validating Cfssl version. Other tests will probably fail too!: ${JSON.stringify(error)}`);
    }
  });
});
