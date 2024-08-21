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

const PkiService = require('./PkiService');
const DFSPModel = require('../models/DFSPModel');
const DFSPEndpointModel = require('../models/DFSPEndpointModel');
const { DirectionEnum } = require('./DfspNetworkConfigService');

const getIPsBundle = async () => {
  const endpoints = await DFSPEndpointModel.findAllLatestByDirection(DirectionEnum.EGRESS);
  return Object.fromEntries(endpoints.map((e) => [e.dfsp_id, e.ipList.map((ip) => ip.address).join(',')]));
};

exports.onboardDFSP = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const { id, monetaryZoneId, isProxy } = await DFSPModel.findByDfspId(dfspId);
  const fxpCurrencies = await DFSPModel.getFxpSupportedCurrencies(dfspId);
  await pkiEngine.populateDFSPClientCertBundle(id, dfspId, monetaryZoneId, !!isProxy, fxpCurrencies);

  const ipsBundle = await getIPsBundle();
  await pkiEngine.populateDFSPInternalIPWhitelistBundle(ipsBundle);

  // TODO: populate external IP whitelist
  // await Promise.all(dfsps.map((dfsp) => pkiEngine.populateDFSPExternalIPWhitelistBundle(ipsBundle)));

  return {};
};
