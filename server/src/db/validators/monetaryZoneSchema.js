const currencyDefinition = require('./definitions/currencyDefinition');

module.exports = {
  type: 'object',
  required: ['monetaryZoneId', 'name'],
  properties: {
    monetaryZoneId: { $ref: '#/definitions/Currency' },
    name: { type: 'string', maxLength: 256 },
    description: { type: 'string', maxLength: 512 }
  },
  definitions: {
    Currency: currencyDefinition
  }

};
