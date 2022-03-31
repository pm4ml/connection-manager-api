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
 * Uses a format analogous to that of CSRInfo
 */
module.exports = class CertInfo {
  /**
   * Builds a CertInfo object from the document
   *
   * @param {Object} doc cfssl certinfo output. See example below at const CFSL_CERT_INFO
   */
  constructor (doc) {
    this.subject = {
      CN: doc && doc.subject && doc.subject.common_name ? Array.isArray(doc.subject.common_name) ? doc.subject.common_name.join() : doc.subject.common_name : null,
      O: doc && doc.subject && doc.subject.organization ? Array.isArray(doc.subject.organization) ? doc.subject.organization.join() : doc.subject.organization : null,
      OU: doc && doc.subject && doc.subject.organizational_unit ? Array.isArray(doc.subject.organizational_unit) ? doc.subject.organizational_unit.join() : doc.subject.organizational_unit : null,
      C: doc && doc.subject && doc.subject.country ? Array.isArray(doc.subject.country) ? doc.subject.country.join() : doc.subject.country : null,
      L: doc && doc.subject && doc.subject.locality ? Array.isArray(doc.subject.locality) ? doc.subject.locality.join() : doc.subject.locality : null,
      emailAddress: doc && doc.subject && doc.subject.email_address ? Array.isArray(doc.subject.email_address) ? doc.subject.email_address.join() : doc.subject.email_address : null,
      ST: doc && doc.subject && doc.subject.province ? Array.isArray(doc.subject.province) ? doc.subject.province.join() : doc.subject.province : null
    };
    this.issuer = {
      CN: doc && doc.issuer && doc.issuer.common_name ? Array.isArray(doc.issuer.common_name) ? doc.issuer.common_name.join() : doc.issuer.common_name : null,
      O: doc && doc.issuer && doc.issuer.organization ? Array.isArray(doc.issuer.organization) ? doc.issuer.organization.join() : doc.issuer.organization : null,
      OU: doc && doc.issuer && doc.issuer.organizational_unit ? Array.isArray(doc.issuer.organizational_unit) ? doc.issuer.organizational_unit.join() : doc.issuer.organizational_unit : null,
      C: doc && doc.issuer && doc.issuer.country ? Array.isArray(doc.issuer.country) ? doc.issuer.country.join() : doc.issuer.country : null,
      L: doc && doc.issuer && doc.issuer.locality ? Array.isArray(doc.issuer.locality) ? doc.issuer.locality.join() : doc.issuer.locality : null,
      emailAddress: doc && doc.issuer && doc.issuer.email_address ? Array.isArray(doc.issuer.email_address) ? doc.issuer.email_address.join() : doc.issuer.email_address : null,
      ST: doc && doc.issuer && doc.issuer.province ? Array.isArray(doc.issuer.province) ? doc.issuer.province.join() : doc.issuer.province : null
    };
    this.serialNumber = doc && doc.serial_number ? doc.serial_number : null;
    this.notBefore = doc && doc.not_before ? doc.not_before : null;
    this.notAfter = doc && doc.not_after ? doc.not_after : null;
    this.signatureAlgorithm = doc && doc.sigalg ? doc.sigalg : null;
    this.subjectAlternativeNames = doc && doc.sans ? doc.sans : null;
    this.extensions = {
      subjectAltName: {
        dns: doc && doc.SubjectSANs && Array.isArray(doc.SubjectSANs.DNSNames) ? doc.SubjectSANs.DNSNames : [],
        ips: doc && doc.SubjectSANs && Array.isArray(doc.SubjectSANs.IPAddresses) ? doc.SubjectSANs.IPAddresses : [],
        emailAddresses: doc && doc.SubjectSANs && Array.isArray(doc.SubjectSANs.EmailAddresses) ? doc.SubjectSANs.EmailAddresses : [],
        uris: doc && doc.SubjectSANs && Array.isArray(doc.SubjectSANs.URIs) ? doc.SubjectSANs.URIs : [],
      }
    };
    this.tryToGetEmailSubject(doc);
  }

  // FIXME: put a better email validation
  tryToGetEmailSubject (doc) {
    if (doc && doc.subject && doc.subject.names) {
      const array = doc.subject.names;
      for (let index = 0; index < array.length; index++) {
        const name = array[index];
        if ((/^\S+@\S+$/).test(name)) {
          // has email
          this.subject.emailAddress = name;
          break;
        }
      }
    }
  }

  getSubjectAlternativeNamesQuantity () {
    return ((this.subjectAlternativeNames && this.subjectAlternativeNames.length) || 0);
  }
};
