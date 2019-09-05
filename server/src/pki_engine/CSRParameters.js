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
