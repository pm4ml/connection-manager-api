/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2020                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 ************************************************************************* */

const k8s = require('@kubernetes/client-node');

class CertManager {
  constructor (config) {
    this.logger = config.logger;
    this.serverCertSecretName = config.serverCertSecretName;
    this.serverCertSecretNamespace = config.serverCertSecretNamespace;

    if (!this.logger || !this.serverCertSecretName || !this.serverCertSecretNamespace) {
      throw new Error('Missing one of the props: logger, serverCertSecretName, serverCertSecretNamespace');
    }

    this.kc = new k8s.KubeConfig();
    this.kc.loadFromDefault();

    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
  }

  async renewServerCert () {
    const patch = [
      {
        op: 'replace',
        path: '/metadata/annotations',
        value: {
          'cert-manager.io/issuer-name': 'force-renewal-triggered'
        }
      }
    ];
    const options = {
      headers: { 'Content-type': k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH },
    };

    return this.k8sApi.patchNamespacedSecret(this.serverCertSecretName, this.serverCertSecretNamespace, patch, undefined, undefined, undefined, undefined, options)
      .then(() => { console.log('Server cert renewal successful'); })
      .catch((err) => { console.log('Error renewing server cert: ', err?.body || err?.message); });
  }
}

module.exports = CertManager;
