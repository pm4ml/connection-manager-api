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

module.exports = {
  subject: {
    CN: 'dfspendpoint1.test.modusbox.com',
    emailAddress: 'connection-manager@modusbox.com',
    O: 'Modusbox',
    OU: 'PKI'
  },
  extensions: {
    subjectAltName: {
      dns: [
        'dfspendpoint1.test.modusbox.com',
        'dfspendpoint2.test.modusbox.com'
      ],
      ips: [
        '163.10.5.24',
        '163.10.5.22'
      ]
    }
  },
};
