Two parallel Playwright test suites live side-by-side:

- Functional specs (`e2e/*.spec.ts`) assert URL routing, auth middleware redirects with `redirect=` query params, HTML5 validation attributes on the login form, and cross-page navigation across all departments.
- Visual specs (`e2e/visual/*.visual.spec.ts`) use Playwright's built-in screenshot comparison against baselines stored under `__snapshots__/visual/login.visual.spec.ts-snapshots/`, with a shared `beforeEach` that hides animated/canvas/video elements and applies a 2% pixel-difference threshold plus masks for dynamic regions (clock, weather card, alert banner, marquee, footer date).

Both suites target the running dev server at `http://localhost:3000` and rely exclusively on public DOM selectors — `data-testid` attributes (`login-form`, `login-card`, `login-clock`, etc.) and semantic tags (`input#email`, `input#password`, `form[data-testid='login-form']`) — rather than any internal page object layer. There is no shared test helper module; each spec file is self-contained and imports only `@playwright/test`.
