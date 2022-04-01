/**************************************************************************
*  (C) Copyright ModusBox Inc. 2020 - All rights reserved.               *
*                                                                        *
*  This file is made available under the terms of the license agreement  *
*  specified in the corresponding source code repository.                *
*                                                                        *
*  ORIGINAL AUTHOR:                                                      *
*       Sridevi Miriyala - sridevi.miriyala@modusbox.com                   *
**************************************************************************/

require('dotenv').config();
const env = require('env-var');

module.exports = {
  mcmEndpoint: env.get('MCM_ENDPOINT').asString()
};
