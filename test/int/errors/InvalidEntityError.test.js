
const InvalidEntityError = require('../../../src/errors/InvalidEntityError');
const BaseError = require('../../../src/errors/BaseError');
const ErrorCategory = require('../../../src/errors/ErrorCategory');

describe('InvalidEntityError', () => {
  it('should be an instance of BaseError', () => {
    const error = new InvalidEntityError('test message', []);
    expect(error).toBeInstanceOf(BaseError);
    expect(error).toBeInstanceOf(InvalidEntityError);
  });

  it('should set the error category to UNPROCESSABLE', () => {
    const error = new InvalidEntityError('test message', []);
    expect(error.category).toEqual(ErrorCategory.UNPROCESSABLE);
  });

  it('should set the error message correctly', () => {
    const message = 'Invalid entity test message';
    const error = new InvalidEntityError(message, []);
    expect(error.message).toEqual(message);
  });

  it('should store validation errors in payload', () => {
    const validationErrors = [
      { field: 'username', message: 'Username is required' },
      { field: 'email', message: 'Invalid email format' }
    ];
    const error = new InvalidEntityError('Validation failed', validationErrors);
    expect(error.payload.validationErrors).toEqual(validationErrors);
    });

    it('should handle empty validation errors array', () => {
      const error = new InvalidEntityError('No validation errors', []);
      expect(error.payload.validationErrors).toEqual([]);
    });

    it('should maintain complete error structure', () => {
      const message = 'Test error';
      const validationErrors = [{ field: 'test', message: 'Test error' }];
      const error = new InvalidEntityError(message, validationErrors);

      expect(error).toHaveProperty('message', message);
      expect(error).toHaveProperty('category', ErrorCategory.UNPROCESSABLE);
      expect(error).toHaveProperty('payload');
      expect(error.payload).toHaveProperty('validationErrors');
      expect(error.payload.validationErrors).toEqual(validationErrors);
  });
});
