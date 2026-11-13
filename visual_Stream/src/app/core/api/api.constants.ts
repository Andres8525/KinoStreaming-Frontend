import { environment } from '../../../environments/environment';

/** Base URL of the Kino REST API, without a trailing slash. Configured per build in src/environments. */
export const API_BASE_URL = environment.apiBaseUrl.replace(/\/+$/, '');
