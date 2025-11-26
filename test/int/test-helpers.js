const { randomUUID } = require('node:crypto');

/**
 * Creates a unique DFSP object for testing with random ID and email
 * @param {Object} overrides - Properties to override in the generated DFSP
 * @returns {Object} DFSP object with unique dfspId, name, and email
 */
const createUniqueDfsp = (overrides = {}) => {
  const id = randomUUID().slice(0, 8);
  return {
    dfspId: `dfsp-${id}`,
    name: `DFSP ${id}`,
    email: `dfsp-${id}@example.com`,
    ...overrides
  };
};

module.exports = {
  createUniqueDfsp
};
