// Development configuration (ng serve). Replaces environment.ts through angular.json fileReplacements.
// The frontend only talks to the Kino backend; the backend is the one connected to Supabase.
export const environment = {
  production: false,
  apiBaseUrl: 'http://localhost:8081/api'
};
