import { HttpErrorResponse } from '@angular/common/http';

export const CONNECTION_ERROR_MESSAGE =
  'No se pudo conectar con el servidor de Kino. Si no se usaba desde hace un rato puede tardar hasta un minuto '
  + 'en despertar: inténtalo de nuevo en unos segundos.';

export function blockedOriginMessage(origin: string): string {
  return `El servidor de Kino está en línea, pero no acepta peticiones desde ${origin}. `
    + 'Abre Kino desde su dirección principal o añade esta dirección a CORS_ALLOWED_ORIGINS en el backend.';
}

export function localBackendMessage(apiBaseUrl: string): string {
  return `No se pudo conectar con el backend local (${apiBaseUrl}). `
    + 'Arráncalo con "mvn spring-boot:run" en la carpeta backend e inténtalo de nuevo.';
}

const TRANSIENT_STATUSES = new Set([0, 502, 503, 504]);

export function isConnectionError(error: unknown): boolean {
  return error instanceof HttpErrorResponse && TRANSIENT_STATUSES.has(error.status);
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof HttpErrorResponse) {
    if (isConnectionError(error)) {
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
