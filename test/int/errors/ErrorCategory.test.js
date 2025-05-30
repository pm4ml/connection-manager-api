
const ErrorCategory = require('../../../src/errors/ErrorCategory');

describe('ErrorCategory', () => {
  describe('Constants', () => {
    it('should export BAD_REQUEST with value "BadRequest"', () => {
      expect(ErrorCategory.BAD_REQUEST).toEqual('BadRequest');
    });

    it('should export UNAUTHORIZED with value "Unauthorized"', () => {
      expect(ErrorCategory.UNAUTHORIZED).toEqual('Unauthorized');
    });

    it('should export FORBIDDEN with value "Forbidden"', () => {
      expect(ErrorCategory.FORBIDDEN).toEqual('Forbidden');
    });

    it('should export NOT_FOUND with value "NotFound"', () => {
      expect(ErrorCategory.NOT_FOUND).toEqual('NotFound');
    });

    it('should export METHOD_NOT_ALLOWED with value "MethodNotAllowed"', () => {
      expect(ErrorCategory.METHOD_NOT_ALLOWED).toEqual('MethodNotAllowed');
    });

    it('should export NOT_ACCEPTABLE with value "NotAcceptable"', () => {
      expect(ErrorCategory.NOT_ACCEPTABLE).toEqual('NotAcceptable');
    });

    it('should export CONFLICT with value "Conflict"', () => {
      expect(ErrorCategory.CONFLICT).toEqual('Conflict');
    });

    it('should export UNSUPPORTED_MEDIA_TYPE with value "UnsupportedMediaType"', () => {
      expect(ErrorCategory.UNSUPPORTED_MEDIA_TYPE).toEqual('UnsupportedMediaType');
    });

    it('should export UNPROCESSABLE with value "Unprocessable"', () => {
      expect(ErrorCategory.UNPROCESSABLE).toEqual('Unprocessable');
    });

    it('should export INTERNAL with value "Internal"', () => {
      expect(ErrorCategory.INTERNAL).toEqual('Internal');
    });

    it('should export NOT_IMPLEMENTED with value "NotImplemented"', () => {
      expect(ErrorCategory.NOT_IMPLEMENTED).toEqual('NotImplemented');
    });
  });

  describe('getStatusCode', () => {
    it('should return 400 for BAD_REQUEST', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.BAD_REQUEST)).toEqual(400);
    });

    it('should return 401 for UNAUTHORIZED', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.UNAUTHORIZED)).toEqual(401);
    });

    it('should return 403 for FORBIDDEN', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.FORBIDDEN)).toEqual(403);
    });

    it('should return 404 for NOT_FOUND', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.NOT_FOUND)).toEqual(404);
    });

    it('should return 405 for METHOD_NOT_ALLOWED', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.METHOD_NOT_ALLOWED)).toEqual(405);
    });

    it('should return 406 for NOT_ACCEPTABLE', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.NOT_ACCEPTABLE)).toEqual(406);
    });

    it('should return 409 for CONFLICT', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.CONFLICT)).toEqual(409);
    });

    it('should return 415 for UNSUPPORTED_MEDIA_TYPE', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.UNSUPPORTED_MEDIA_TYPE)).toEqual(415);
    });

    it('should return 422 for UNPROCESSABLE', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.UNPROCESSABLE)).toEqual(422);
    });

    it('should return 500 for INTERNAL', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.INTERNAL)).toEqual(500);
    });

    it('should return 501 for NOT_IMPLEMENTED', () => {
      expect(ErrorCategory.getStatusCode(ErrorCategory.NOT_IMPLEMENTED)).toEqual(501);
    });

    it('should return 500 for undefined category', () => {
      expect(ErrorCategory.getStatusCode(undefined)).toEqual(500);
    });

    it('should return 500 for invalid category', () => {
      expect(ErrorCategory.getStatusCode('InvalidCategory')).toEqual(500);
    });
  });
});
