const BaseError = require('../errors/BaseError');
const ErrorCategory = require('../errors/ErrorCategory');
const ApiResponse = require('../response/ApiResponse');

var ResponsePayload = function (code, payload) {
  this.code = code;
  this.payload = payload;
};

exports.respondWithCode = function (code, payload) {
  return new ResponsePayload(code, payload);
};

var writeJson = exports.writeJson = function (response, arg1, arg2) {
  var code;
  var payload;

  if (arg1 && arg1 instanceof ResponsePayload) {
    writeJson(response, arg1.payload, arg1.code);
    return;
  }

  if (arg1 && arg1 instanceof ApiResponse) {
    writeJson(response, arg1.payload, arg1.code);
    return;
  }

  if (arg2 && Number.isInteger(arg2)) {
    code = arg2;
  } else {
    if (arg1 && Number.isInteger(arg1)) {
      code = arg1;
    }
  }
  if (code && arg1) {
    payload = arg1;
  } else if (arg1) {
    payload = arg1;
  }

  if (arg1 && arg1 instanceof Error) {
    console.error(arg1);
    code = 500;
    payload = {
      payload: arg1.payload || arg1.name,
      message: arg1.message
    };
  }

  if (arg1 && arg1 instanceof BaseError) {
    code = ErrorCategory.getStatusCode(arg1.category);
  }

  if (!code) {
    // if no response code given, we default to 200
    code = 200;
  }
  if (typeof payload === 'object') {
    payload = JSON.stringify(payload, null, 2);
  }

  if (code !== 204) {
    response.writeHead(code, { 'Content-Type': 'application/json' });
  } else {
    response.statusCode = code;
  }
  response.end(payload);
};
