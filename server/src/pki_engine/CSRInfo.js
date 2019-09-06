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

/**
 * Uses the same format as CSRParameters
 */

/**
 *  Common Name (CN)
    Organizational Unit (OU)
    Organization (O)
    Locality (L)
    State (ST)
    Country (C)
    Email Address (emailAddress)
  */
const MANDATORY_DISTINGUISHED_NAMES = ['CN', 'OU', 'O', 'L', 'ST', 'C', 'emailAddress'];

// https://oidref.com/1.2.840.113549.1.9.1
// http://www.oid-info.com/get/1.2.840.113549.1.9.1
const emailAddressOIDN = [1, 2, 840, 113549, 1, 9, 1];

module.exports = class CSRInfo {
  /**
   * Builds a CSRInfo object from the document
   *
   * @param {Object} doc cfssl csrinfo output. See example below at const CFSL_CSR_INFO
   */
  constructor (doc) {
    let emailAddress = null;
    // Info: the main cfssl version doesn't return the doc.Subject.emailAddress attribute, so there will never be a doc.Subject.EmailAddress
    // When that is fixed with our fork, we can get the Subject emailAddress as emailAddress: doc && doc.Subject && doc.Subject.EmailAddress ? Array.isArray(doc.Subject.EmailAddress) ? doc.Subject.EmailAddress.join() : doc.Subject.EmailAddress : null,
    // Until then we'll pick it from the Names array
    if (doc && doc.Subject && doc.Subject.Names && Array.isArray(doc.Subject.Names)) {
      let emailEntry = doc.Subject.Names.find(entry => entry.Type.length === emailAddressOIDN.length && entry.Type.every((value, index) => value === emailAddressOIDN[index]));
      emailAddress = emailEntry ? emailEntry.Value : null;
    }
    this.subject = {
      CN: doc && doc.Subject && doc.Subject.CommonName ? Array.isArray(doc.Subject.CommonName) ? doc.Subject.CommonName.join() : doc.Subject.CommonName : null,
      emailAddress: emailAddress,
      O: doc && doc.Subject && doc.Subject.Organization ? Array.isArray(doc.Subject.Organization) ? doc.Subject.Organization.join() : doc.Subject.Organization : null,
      OU: doc && doc.Subject && doc.Subject.OrganizationalUnit ? Array.isArray(doc.Subject.OrganizationalUnit) ? doc.Subject.OrganizationalUnit.join() : doc.Subject.OrganizationalUnit : null,
      C: doc && doc.Subject && doc.Subject.Country ? Array.isArray(doc.Subject.Country) ? doc.Subject.Country.join() : doc.Subject.Country : null,
      L: doc && doc.Subject && doc.Subject.Locality ? Array.isArray(doc.Subject.Locality) ? doc.Subject.Locality.join() : doc.Subject.Locality : null,
      ST: doc && doc.Subject && doc.Subject.Province ? Array.isArray(doc.Subject.Province) ? doc.Subject.Province.join() : doc.Subject.Province : null
    };
    this.extensions = {
      subjectAltName: {
        dns: doc && doc.DNSNames && Array.isArray(doc.DNSNames) ? doc.DNSNames : [],
        ips: doc && doc.IPAddresses && Array.isArray(doc.IPAddresses) ? doc.IPAddresses : [],
        emailAddresses: doc && doc.EmailAddresses && Array.isArray(doc.EmailAddresses) ? doc.EmailAddresses : [],
        uris: doc && doc.URIs && Array.isArray(doc.URIs) ? doc.URIs : [],
      }
    };
  }

  /**
   * @returns { valid: true } or { valid: false, reason: 'message' }
   */
  hasAllRequiredDistinguishedNames () {
    for (let index = 0; index < MANDATORY_DISTINGUISHED_NAMES.length; index++) {
      const field = MANDATORY_DISTINGUISHED_NAMES[index];
      if (!this.subject[field]) {
        return { valid: false, reason: `Missing: ${field}` };
      }
    }
    return { valid: true };
  }

  getSubjectAlternativeNamesQuantity () {
    let total = 0;
    let subjectAltName = this.extensions.subjectAltName;

    total += subjectAltName.dns.length;
    total += subjectAltName.ips.length;
    total += subjectAltName.emailAddresses.length;
    total += subjectAltName.uris.length;

    return total;
  }

  getAllSubjectAltNameOneList () {
    let subjectAltName = this.extensions.subjectAltName;
    let allTogether = [];

    allTogether.push(...subjectAltName.dns);
    allTogether.push(...subjectAltName.ips);
    allTogether.push(...subjectAltName.emailAddresses);
    allTogether.push(...subjectAltName.uris);

    return allTogether;
  }
};
