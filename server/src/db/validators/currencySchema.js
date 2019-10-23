const currencyDefinition = require('./definitions/currencyDefinition');

module.exports = {
  type: 'object',
  required: ['currencyId', 'name'],
  properties: {
    currencyId: { $ref: '#/definitions/Currency' },
    name: { type: 'string', maxLength: 128 },
    scale: { type: 'integer' }
  },
  definitions: {
    Currency: currencyDefinition
  }
};
