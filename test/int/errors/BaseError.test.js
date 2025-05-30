
const BaseError = require('../../../src/errors/BaseError.js');

// filepath: /home/naph/cm-api/connection-manager-api/src/errors/BaseError.test.js


describe('BaseError', () => {
  it('should create an instance of BaseError', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error).toBeInstanceOf(BaseError);
  });

  it('should set the category and message properties correctly', () => {
    const category = 'TestCategory';
    const message = 'Test message';
    const error = new BaseError(category, message);
    expect(error.category).toEqual(category);
    expect(error.message).toEqual(message);
  });

  it('should set the name property to the constructor name', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error.name).toEqual('BaseError');
  });

  it('should set the payload property correctly', () => {
    const message = 'Test message';
    const error = new BaseError('TestCategory', message);
    expect(error.payload).toEqual({
      id: 'BaseError',
      message
    });
    });

    it('should set the headers property to an empty object', () => {
      const error = new BaseError('TestCategory', 'Test message');
      expect(error.headers).toEqual({});
    });

  it('should capture the stack trace if Error.captureStackTrace is available', () => {
    const error = new BaseError('TestCategory', 'Test message');
      expect(typeof error.stack).toBe('string');
    });

    it('should not fail if Error.captureStackTrace is not available', () => {
      const originalCaptureStackTrace = Error.captureStackTrace;
      Error.captureStackTrace = undefined;
      const error = new BaseError('TestCategory', 'Test message');
      expect(typeof error.stack).toBe('string');
      Error.captureStackTrace = originalCaptureStackTrace;
  });
});
