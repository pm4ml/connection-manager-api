 /**************************************************************************
 *  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Sridevi Miriyala - sridevi.miriyala@modusbox.com                   *
 **************************************************************************/

import * as dotenv from 'dotenv';
import * as assert from 'assert';

dotenv.config();

function ensureEnv(e: string): string {
  const result = process.env[e];
  assert.notStrictEqual(typeof result, 'undefined', `Required ${e} to be set in the environment`);
  return result as string;
}

// TODO: ajv
export const config = {
  pm4mlEndpoint: ensureEnv('PM4ML_ENDPOINT'),
  simCoreConnectorEndpoint: ensureEnv('SIM_CORE_CONNECTOR_ENDPOINT'),
  credentials: {
    test: {
      username: 'test',
      password: 'test',
    },
    nofirstlastname: {
      username: 'nofirstlastname',
      password: 'test',
    },
    nofirstname: {
      username: 'nofirstname',
      password: 'test',
    },
    nolastname: {
      username: 'nolastname',
      password: 'test',
    },
  },
  voodooTimeoutMs: 30000,
};
