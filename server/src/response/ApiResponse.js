
const ApiResponse = function (code, message, type) {
  this.code = code;
  this.message = message;
  this.type = type;
  this.payload = {
    code,
    message,
    type
  };
};

module.exports = ApiResponse;
