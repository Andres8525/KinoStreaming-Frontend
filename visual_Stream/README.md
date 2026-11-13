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

Vercel also serves every deployment on its own URL (`https://<project>-<hash>-<team>.vercel.app`, opened by the dashboard's "Visit" button) and on branch URLs. The backend allows them automatically for each `https://<project>.vercel.app` in `CORS_ALLOWED_ORIGINS`, and it also allows `http://localhost:<port>` for local development.

## Troubleshooting

- **"No se pudo conectar con el servidor de Kino" on login or register**: the browser could not reach the API. Open `https://kino-backend-alq2.onrender.com/api/health`: `cors.origins` must contain the exact frontend origin (for example `https://kino-streamingg-frontend.vercel.app`). If it is missing, fix `CORS_ALLOWED_ORIGINS` in Render; the backend also accepts bare domains and trailing slashes.
- **"El servidor de Kino está en línea, pero no acepta peticiones desde …"**: after a connection error the app checks `/api/health` again and, if that fails, contacts the server in `no-cors` mode. When the server answers, the problem is CORS, so the message names the address the page was opened from: open Kino from its main address or add that address to `CORS_ALLOWED_ORIGINS`. In a development build pointing to `localhost`, an unreachable API shows "No se pudo conectar con el backend local" instead.
- **Login takes long after a while without use**: the backend repository runs a GitHub Actions keep-alive (`.github/workflows/keep-alive.yml`) that pings `/api/health` every 10 minutes so Render never sleeps; make sure Actions are enabled there. The frontend also preconnects to the API in `index.html`, wakes the backend as soon as the app opens and lazy-loads Creator Studio, the player and the live page, so the first screen downloads less JavaScript.
- **I only see the video URL field**: that is the *Publicar video* tab. Camera broadcasts are in **Creator Studio → Transmitir en vivo → Con mi cámara** (also from the navbar's *Transmitir* link, the shortcut at the top of *Publicar video* and the dashboard). Allow camera and microphone access when the browser asks.
- **First request is slow**: the Render free plan sleeps after 15 minutes. The app pings `/api/health` as soon as it opens, retries read requests (GET) on network/502/503/504 errors and shows a "Conectando con el servidor…" notice on the login and registration forms. Writes such as creating an account are never retried automatically.
- **Pages without styles**: `.postcssrc.json` must exist so Tailwind generates its utility classes.

## Features

- **Accounts**: registration and login with JWT; signed-in users are sent from `/login` and `/register` to the dashboard, and backend field errors are shown next to each field. The session lives in `sessionStorage`; expired tokens are discarded, and if the API rejects the session (401) the user is signed out and sent back to login, returning to the same page afterwards.
- **Dashboard**: personalized recommendations, trending videos and the full catalog, with accent-insensitive search (`?q=`) and category filters. Video cards show whether access is free or paid.
- **Player**: streams each video from its `videoUrl`, records one view per session and shows the video title in the browser tab.
- **Creator Studio** (every signed-in account): publish videos with a category, tags, access price and suggested donation, see analytics, and delete published videos.
- **En vivo ahora**: live broadcasts appear on the dashboard and open in `/live/:id` for any signed-in account. Camera broadcasts connect directly to the creator's browser over WebRTC (with automatic reconnection and "waiting for the camera" states); HLS broadcasts play with hls.js (loaded only on that page) or natively on Safari. The page detects when the broadcast ends.
- **Transmitir en vivo** (Creator Studio tab, also `/creator-studio?tab=live`):
  - **Con mi cámara** (default): *Abrir cámara* asks for camera and microphone permission and shows a preview; *Empezar a transmitir* goes live. The tab answers each viewer through Kino's signaling endpoints and sends the video directly to them (it shows the number of connected viewers), so it must stay open while live; after a reload, *Reanudar cámara* continues the same broadcast.
  - **Con OBS (HLS)**: register the HLS playback URL of a stream sent with OBS to Cloudflare Stream, Mux, AWS IVS, nginx-rtmp…
- **Categories**: choosing Cortometrajes, Documentales, Animación, Música, Videoclips, Experimental or Tutoriales shows what the category offers ("Aquí podrás encontrar…") and all its videos; an empty category invites creators to publish the first one. A video belongs to the category chosen when publishing it in Creator Studio.
- **Kino IA**: dashboard panel with the most watched ranking, top categories, rising videos and a summary from `/api/ai/trending-insights`. It shows "Generado con Gemini IA" when the summary comes from Google Gemini and "Análisis automático de Kino" otherwise. Gemini is configured only in the backend (`AI_ENABLED`, `AI_PROVIDER=gemini`, `AI_API_KEY` in Render); the API key never reaches the frontend.
- **Not-found page** for unknown URLs and branded tab titles (`<page> · Kino`).

Every account can publish and go live. Camera broadcasts use the public STUN servers listed in `iceServers` (`src/environments`); viewers on very restrictive networks (some corporate or mobile networks) may need a TURN server added there. Each viewer receives the video directly from the creator's browser, so the creator's upload bandwidth limits the audience (around 5–10 simultaneous viewers on a typical home connection); larger audiences should stream with OBS and HLS. Payments and file uploads are not implemented: videos are published by URL and must be publicly reachable in a browser-supported format such as MP4.

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
