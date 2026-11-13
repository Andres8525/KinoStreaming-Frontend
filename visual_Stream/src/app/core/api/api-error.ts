import { HttpErrorResponse } from '@angular/common/http';

export const CONNECTION_ERROR_MESSAGE =
  'No se pudo conectar con Kino. Comprueba tu conexión o inténtalo de nuevo en unos segundos.';

/**
 * Turns an HTTP error from the Kino API into a message that can be shown to the user.
 * Uses the backend `ApiError.message` when present, a connection message when the
 * server could not be reached, and the given fallback otherwise.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return CONNECTION_ERROR_MESSAGE;
    }
    const body: unknown = error.error;
    if (typeof body === 'object' && body !== null && 'message' in body
      && typeof body.message === 'string' && body.message.trim()) {
      return body.message;
    }
  }
  return fallback;
}

/** Field errors (`validationErrors`) returned by the backend for a 400 response. */
export function apiValidationErrors(error: unknown): Record<string, string> {
  if (error instanceof HttpErrorResponse) {
    const body: unknown = error.error;
    if (typeof body === 'object' && body !== null && 'validationErrors' in body
      && typeof body.validationErrors === 'object' && body.validationErrors !== null) {
      return Object.fromEntries(
        Object.entries(body.validationErrors).filter((entry): entry is [string, string] => typeof entry[1] === 'string')
      );
    }
  }
  return {};
}
