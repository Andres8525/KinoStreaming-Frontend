import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * The session lives in the browser (sessionStorage), so pages behind the auth guards
 * must be rendered on the client. Prerendering them would bake the "not signed in"
 * redirect into static HTML and send signed-in users back to /login on reload.
 * Only the public auth pages are prerendered.
 */
export const serverRoutes: ServerRoute[] = [
  { path: 'login', renderMode: RenderMode.Prerender },
  { path: 'register', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client }
];
