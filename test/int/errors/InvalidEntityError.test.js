const { expect } = require('chai');
const InvalidEntityError = require('../../../src/errors/InvalidEntityError');
const BaseError = require('../../../src/errors/BaseError');
const ErrorCategory = require('../../../src/errors/ErrorCategory');

describe('InvalidEntityError', () => {
  it('should be an instance of BaseError', () => {
    const error = new InvalidEntityError('test message', []);
    expect(error).to.be.instanceOf(BaseError);
    expect(error).to.be.instanceOf(InvalidEntityError);
  });

  it('should set the error category to UNPROCESSABLE', () => {
    const error = new InvalidEntityError('test message', []);
    expect(error.category).to.equal(ErrorCategory.UNPROCESSABLE);
  });

  it('should set the error message correctly', () => {
    const message = 'Invalid entity test message';
    const error = new InvalidEntityError(message, []);
    expect(error.message).to.equal(message);
  });

  it('should store validation errors in payload', () => {
    const validationErrors = [
      { field: 'username', message: 'Username is required' },
      { field: 'email', message: 'Invalid email format' }
    ];
    const error = new InvalidEntityError('Validation failed', validationErrors);
    expect(error.payload.validationErrors).to.deep.equal(validationErrors);
  });

  it('should handle empty validation errors array', () => {
    const error = new InvalidEntityError('No validation errors', []);
    expect(error.payload.validationErrors).to.deep.equal([]);
  });

  it('should maintain complete error structure', () => {
    const message = 'Test error';
    const validationErrors = [{ field: 'test', message: 'Test error' }];
    const error = new InvalidEntityError(message, validationErrors);

    expect(error).to.have.property('message', message);
    expect(error).to.have.property('category', ErrorCategory.UNPROCESSABLE);
    expect(error).to.have.property('payload');
    expect(error.payload).to.have.property('validationErrors');
    expect(error.payload.validationErrors).to.deep.equal(validationErrors);
  });
});
