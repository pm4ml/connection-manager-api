module.exports = {
  csr: {
    hosts: [
      'root-ca.modusbox.com',
      'www.root-ca.modusbox.com'
    ],
    key: {
      algo: 'rsa',
      size: 4096
    },
    names: [
      {
        CN: 'modusbox',
        O: 'Modusbox',
        OU: 'TSP',
        L: '-',
        ST: '-',
        C: '-'
      }
    ]
  },
  default: {
    expiry: '87600h',
    usages: [
      'signing'
    ]
  }
};
