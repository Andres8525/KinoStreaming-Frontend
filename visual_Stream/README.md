# Kino — Frontend

Angular 21 web app for **Kino**, a streaming platform for independent creators. It talks to the Kino REST API (Spring Boot, deployed on Render, data in Supabase).

## Requirements

- Node.js `^20.19.0 || ^22.12.0 || >=24.0.0`
- npm 10

```bash
npm install
```

## Backend URL per environment

The API base URL is defined in `src/environments`:

| Command | File | API |
| --- | --- | --- |
| `npm start` (`ng serve`) | `environment.development.ts` | `http://localhost:8081/api` (backend running locally) |
| `npm run build` (`ng build`) | `environment.ts` | `https://kino-backend-alq2.onrender.com/api` (Render) |

Every service builds its URLs from `API_BASE_URL` (`src/app/core/api/api.constants.ts`), so changing the environment file is enough. The backend must allow the frontend origin in `CORS_ALLOWED_ORIGINS`.

The Render free plan sleeps after 15 minutes without traffic, so the first request afterwards can take about a minute.

## Styles

Global styles use Tailwind CSS v4 (`@import "tailwindcss"` in `src/styles.css`). The Angular builder runs it through PostCSS using `.postcssrc.json`; without that file no Tailwind utility classes are generated and pages render unstyled.

## Scripts

```bash
npm start                         # dev server at http://localhost:4200
npm run build                     # production build in dist/visual_Stream
npm test -- --watch=false         # unit tests (Vitest)
npm run serve:ssr:visual_Stream   # serve the production build with SSR on port 4000
```

## Deploy to Vercel

The app is deployed as static files: `login` and `register` are prerendered, and every other page (dashboard, player, Creator Studio) is rendered in the browser, because the session lives in `sessionStorage`. `vercel.json` already contains the build settings, the fallback to `index.csr.html` for client routes, long-term caching for hashed assets and basic security headers.

1. Vercel > **Add New** > **Project** > import `KinoStreaming-Frontend` from GitHub.
2. Set **Root Directory** to `visual_Stream` (the Angular app is in that folder). Leave the framework preset as detected; `vercel.json` overrides the build command and the output directory.
3. **Deploy**. No environment variables are needed: the API URL is compiled from `src/environments/environment.ts`.
4. Add the Vercel domain (for example `https://kino-frontend.vercel.app`) to `CORS_ALLOWED_ORIGINS` in the Render backend, separated by commas from the existing values, and save. Without it the browser blocks every API call.

Preview deployments get a different URL each time, so they can only call the API if that exact origin is also allowed in CORS.

## Features

- **Accounts**: registration and login with JWT. The session lives in `sessionStorage`; expired tokens are discarded, and if the API rejects the session (401) the user is signed out and sent back to login, returning to the same page afterwards.
- **Dashboard**: personalized recommendations, trending videos and the full catalog, with accent-insensitive search (`?q=`) and category filters. Video cards show whether access is free or paid.
- **Player**: streams each video from its `videoUrl`, records one view per session and shows the video title in the browser tab.
- **Creator Studio** (only `CREATOR` accounts): publish videos with tags, access price and suggested donation, see analytics, and delete published videos. Viewers do not see the link and are redirected with an explanation.
- **En vivo ahora**: live broadcasts appear on the dashboard and open in `/live/:id`, which plays HLS (`.m3u8`) with hls.js (loaded only on that page) or natively on Safari, and detects when the broadcast ends.
- **Transmitir en vivo** (Creator Studio tab, also `/creator-studio?tab=live`): creators register the HLS playback URL of their stream (OBS → Cloudflare Stream, Mux, AWS IVS, nginx-rtmp…) to go live, and end it from the same tab.
- **Kino IA**: dashboard panel with the most watched ranking, top categories, rising videos and a summary from `/api/ai/trending-insights`. It shows whether the summary was written by the AI provider or by Kino's built-in analysis; connecting the AI API only requires backend configuration.
- **Not-found page** for unknown URLs and branded tab titles (`<page> · Kino`).

New accounts are created as `VIEWER`. The `CREATOR` role is granted by an administrator in the database (see the backend README). Payments and file uploads are not implemented: videos are published by URL and must be publicly reachable in a browser-supported format such as MP4.

## Project structure

```
src/app/
  core/
    api/        API base URL and error message helpers
    auth/       auth service, guards, interceptors, JWT helpers
    routing/    page title strategy
    text/       accent-insensitive text normalization
    ai/         Kino IA trending insights client
    live/       live streaming client and models
    videos/     video API service, models and formatters
  components/   navbar, video card, live-now strip, Kino IA panel, go-live panel
  pages/        dashboard, video player, live watch, creator studio, login, register, not found
src/environments/  API URL per build configuration
```
