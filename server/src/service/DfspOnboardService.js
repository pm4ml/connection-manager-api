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
const DFSPEndpointItemModel = require('../models/DFSPEndpointItemModel');

const getIPsBundle = async () => {
  const dfsps = await DFSPModel.findAll();
  const ips = await DFSPEndpointItemModel.findAllByDirectionType('EGRESS', 'IP');
  const dfspNames = Object.fromEntries(dfsps.map((dfsp) => [dfsp.id, dfsp.name]));
  return ips.reduce((acc, ip) => {
    acc[dfspNames[ip.dfsp_id]] = acc[dfspNames[ip.dfsp_id]] ? acc[dfspNames[ip.dfsp_id]] + ',' + ip.value.address : ip.value.address;
    return acc;
  });
};

exports.onboardDFSP = async (ctx, dfspId) => {
  await PkiService.validateDfsp(ctx, dfspId);
  const { pkiEngine } = ctx;
  const dfsps = await DFSPModel.findAll();
  await Promise.all(dfsps.map((dfsp) => pkiEngine.populateDFSPClientCertBundle(dfsp.id, dfsp.name)));

  const ipsBundle = await getIPsBundle();
  await pkiEngine.populateDFSPInternalIPWhitelistBundle(ipsBundle);

  // TODO: populate external IP whitelist
  // await Promise.all(dfsps.map((dfsp) => pkiEngine.populateDFSPExternalIPWhitelistBundle(ipsBundle)));
};
