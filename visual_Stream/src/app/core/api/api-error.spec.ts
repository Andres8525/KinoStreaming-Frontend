import { HttpErrorResponse } from '@angular/common/http';
import { apiErrorMessage, apiValidationErrors, CONNECTION_ERROR_MESSAGE, isConnectionError } from './api-error';

describe('apiErrorMessage', () => {
  it('uses the message sent by the backend', () => {
    const error = new HttpErrorResponse({ status: 409, error: { message: 'El correo ya está registrado' } });

    expect(apiErrorMessage(error, 'fallback')).toBe('El correo ya está registrado');
  });

  it('explains connection failures', () => {
    const error = new HttpErrorResponse({ status: 0, error: new ProgressEvent('error') });

    expect(apiErrorMessage(error, 'fallback')).toBe(CONNECTION_ERROR_MESSAGE);
  });

  it('falls back when the body has no usable message', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: '<html>' }), 'fallback')).toBe('fallback');
    expect(apiErrorMessage(new HttpErrorResponse({ status: 500, error: { message: '  ' } }), 'fallback')).toBe('fallback');
    expect(apiErrorMessage(new Error('boom'), 'fallback')).toBe('fallback');
  });
});

describe('apiValidationErrors', () => {
  it('returns string field errors only', () => {
    const error = new HttpErrorResponse({
      status: 400,
      error: { validationErrors: { videoUrl: 'Debe ser una URL', ignored: 3 } }
    });

    expect(apiValidationErrors(error)).toEqual({ videoUrl: 'Debe ser una URL' });
  });

  it('returns an empty object for other errors', () => {
    expect(apiValidationErrors(new HttpErrorResponse({ status: 404 }))).toEqual({});
  });
});

describe('isConnectionError', () => {
  it('detects network, CORS and gateway failures', () => {
    for (const status of [0, 502, 503, 504]) {
      expect(isConnectionError(new HttpErrorResponse({ status }))).toBe(true);
    }
  });

  it('ignores answers from the API and other errors', () => {
    for (const status of [400, 401, 403, 404, 409, 500]) {
      expect(isConnectionError(new HttpErrorResponse({ status }))).toBe(false);
    }
    expect(isConnectionError(new Error('boom'))).toBe(false);
  });

  it('explains gateway errors with the connection message', () => {
    expect(apiErrorMessage(new HttpErrorResponse({ status: 503, error: '<html>' }), 'fallback')).toBe(CONNECTION_ERROR_MESSAGE);
  });
});
