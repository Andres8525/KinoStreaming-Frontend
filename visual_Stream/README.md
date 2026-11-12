# VisualStream

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.9.

## Kino streaming features

The Angular app calls the Kino backend at `http://localhost:8080/api`. The authenticated dashboard loads the public catalog and trending list, plus personalized recommendations from `/api/feed/recommendations`. Creator Studio publishes video metadata to `/api/creator/videos` and reads the creator analytics endpoint.

Videos stream directly from their `videoUrl`; provide a publicly reachable URL in a browser-supported format (for example, MP4). Binary uploads, payments, and a trained/external AI model are not configured. Recommendations use the backend's local collaborative-plus-popularity ranker.

For creator features, sign in with an account whose backend role is `CREATOR`. See the backend README for API, database, and migration details.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
