# ZCMC MSWD Server (Laravel 12 + Inertia.js + React SSR)

This is the unified full-stack repository for the ZCMC Medical Social Work Department (MSWD) Patient Safety Net Portal. It server-renders the React UI via Inertia SSR with Sanctum cookie-session authentication, Filament admin at `/admin`, and a comprehensive REST API.

## Commands

- `composer dev` — runs full dev environment (`php artisan serve`, queue worker, `vite` HMR, and `php artisan inertia:start-ssr`).
- `npm run dev` — runs Vite dev server.
- `npm run build` — builds production client bundle and SSR bundle (`vite build && vite build --ssr`).
- `npm run typecheck` — TypeScript check (`tsc --noEmit`).
- `npm run lint` — ESLint on `resources/js`.
- `npm run format` — Prettier format on `resources/js`.
- `composer test` or `php artisan test` — runs Pest PHP tests.
- `php artisan inertia:start-ssr` / `php artisan inertia:stop-ssr` — manages Node SSR server process.

## Architecture

### Inertia Hybrid Architecture

- **Inertia Layer (`resources/js/pages/`)**:
  - Owns routing, auth session state, shared user props (`auth.user`, `auth.roles`, `auth.permissions`), and initial page renders.
  - Page routes in `routes/web.php`: `GET /login`, `GET /` (Patients registry), `GET /patients/{patient}`, `GET /caseload`, `GET /cases/{case}`, `GET /reports`, `GET /reports/social-cases`, `GET /audit`.
  - Main persistent layout is `resources/js/components/layout/main-layout.tsx`.
- **API & TanStack Query Layer**:
  - `resources/js/lib/api-client.ts` uses Sanctum cookie sessions (`credentials: "same-origin"`, `X-XSRF-TOKEN`).
  - Feature hooks (`useQuery`, `useMutation`) manage tab-level data, CRUD operations, and cache invalidation.
- **Server-Side Rendering (SSR)**:
  - `resources/js/ssr.tsx` pre-renders pages with `ReactDOMServer.renderToString`.
  - `config/inertia.php` enables SSR with graceful CSR fallback (`throw_on_error => false`).
  - Browser state (`window`, `localStorage`, `matchMedia`) is guarded for SSR safety. Theme is synchronized to cookies to prevent first-paint flash.

### Feature Folders

`resources/js/features/<feature>/{api,components,hooks,types}`:
- `auth`: session login, auth state, permission checks (`usePermission`, `useHasRole`).
- `patients`: registry list, master-detail view, 11-tab patient profile.
- `socioeconomic`: itemized living expenses and family income.
- `cases`: caseload, episodes, progress notes, signoff, assessments.
- `hospital`: encounters, admission details, HIS patient search & 1-click import (`POST /hospital-patients/{id}/import`), hospital integration.
- `guarantees`: MSWD patient guarantors per HIS encounter with their assistance breakdown; prints the DOH-MAIFIP Acknowledgement Slip (`GET /guarantees/{id}/acknowledgement-slip/pdf`).
- Encounter printables (`hospital/components/dialogs/`): the City Mayor Acknowledgement Slip, ZCMC-F-MSS-04 (`GET /patient-transactions/{id}/city-mayor-slip/pdf`, `CityMayorSlipDialog`).
- `library`: Library settings (guarantors, types of assistance, modes, fund sources, signatories printed on forms).
- `audit`: system-wide activity logs.

### UI & Styling

- shadcn/ui with `@base-ui/react` primitives (not Radix).
- Tailwind CSS v4 in `resources/css/app.css` with OKLCH theme variables.
- Fonts: `font-sans` (Roboto Variable), `font-heading` (Raleway Variable).
- Icons: `lucide-react`.

## Conventions

- Import alias: `@/` resolves to `resources/js/`.
- Prettier: no semicolons, double quotes, 2 spaces, 80 width.
- Always run `npm run typecheck && npm run lint && composer test` before completing tasks.
