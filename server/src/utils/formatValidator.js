const { URL } = require('url');
const ValidationError = require('../errors/ValidationError');

/**
 * Validates a single IP address or a range in CIDR notation
 */
exports.validateIpAddress = (candidate) => {
  return (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(candidate));
};

exports.validateURL = (candidate) => {
  try {
    let url = new URL(candidate);
    if (!(url.protocol.toLowerCase() === 'http:' || url.protocol.toLowerCase() === 'https:')) {
      return false;
    }
    return true;
  } catch (TypeError) {
    return false;
  }
};

exports.validateIPAddressInput = (ip) => {
  if (!exports.validateIpAddress(ip)) {
    throw new ValidationError('Invalid IP address or CIDR range');
  }
};

exports.validateURLInput = (url) => {
  if (!exports.validateURL(url)) {
    throw new ValidationError('Invalid URL');
  }
};

exports.validatePort = (inputValue) => {
  if (!Number.isInteger(Number(inputValue))) {
    throw new ValidationError(`port range validation error: ${inputValue} is not an Integer`);
  }
  let value = Number(inputValue);
  if (value < 0 || value > 65535) {
    throw new ValidationError(`port range validation error: ${inputValue} is not in the [0,65535] range`);
  }
};

exports.validatePorts = (ports) => {
  ports.forEach(element => {
    if (/^([0-9]+)-([0-9]+)$/.test(element)) {
      let limits = element.split('-');
      limits.forEach(limit => {
        exports.validatePort(limit);
      });
    } else {
      exports.validatePort(element);
    }
  });
  return true;
};
