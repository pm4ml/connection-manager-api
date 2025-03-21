const { expect } = require('chai');
const BaseError = require('../../../src/errors/BaseError.js');

// filepath: /home/naph/cm-api/connection-manager-api/src/errors/BaseError.test.js


describe('BaseError', () => {
  it('should create an instance of BaseError', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error).to.be.instanceOf(BaseError);
  });

  it('should set the category and message properties correctly', () => {
    const category = 'TestCategory';
    const message = 'Test message';
    const error = new BaseError(category, message);
    expect(error.category).to.equal(category);
    expect(error.message).to.equal(message);
  });

  it('should set the name property to the constructor name', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error.name).to.equal('BaseError');
  });

  it('should set the payload property correctly', () => {
    const message = 'Test message';
    const error = new BaseError('TestCategory', message);
    expect(error.payload).to.deep.equal({
      id: 'BaseError',
      message
    });
  });

  it('should set the headers property to an empty object', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error.headers).to.deep.equal({});
  });

  it('should capture the stack trace if Error.captureStackTrace is available', () => {
    const error = new BaseError('TestCategory', 'Test message');
    expect(error.stack).to.be.a('string');
  });

  it('should not fail if Error.captureStackTrace is not available', () => {
    const originalCaptureStackTrace = Error.captureStackTrace;
    Error.captureStackTrace = undefined;
    const error = new BaseError('TestCategory', 'Test message');
    expect(error.stack).to.be.a('string');
    Error.captureStackTrace = originalCaptureStackTrace;
  });
});