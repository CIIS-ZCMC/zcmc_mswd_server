# Plan: Move the React client into Laravel as Inertia.js + React SSR

**Status legend:** ☐ not started · ◐ in progress · ☑ done

| Phase | Status |
|-------|--------|
| 0. Toolchain alignment | ☑ |
| 1. Host the SPA inside Laravel | ☑ |
| 2. Sanctum cookie-session auth | ◐ |
| 3. Inertia (client-side rendering) | ◐ |
| 4. SSR | ☑ |
| 5. Deployment & cleanup | ◐ |

**Open items (as of 2026-10-06):**
- Phase 2: the token `POST /api/login` (`LoginController`) is still registered beside the web session login. Decide whether a non-browser consumer needs it; otherwise remove it and revoke issued tokens.
- Phase 3: the web page routes are only `auth`-gated, not yet `permission:`-gated. The page controllers pass route ids only (no primary data via API Resources), and no `useQuery` is seeded with `initialData` yet, so pages still fetch their data client-side after SSR.
- Phase 5: production SSR process (supervisor/NSSM + `inertia:stop-ssr` in the deploy hook) is not set up, and the `zcmc_mswd_client` repo is not archived. The client halves of the plan docs live in `docs/client/` and are not yet merged into their server counterparts.

## Context

Today the system is two repos: `zcmc_mswd_client` (React 19 + Vite 8 SPA, TanStack Query, react-router, bearer token in `localStorage`) and `zcmc_mswd_server` (Laravel 12, Sanctum, Filament at `/admin`, spatie permission/activitylog, `laravel-vite-plugin` 2 + Tailwind v4 already installed, `web.php` holds only the stock `welcome` route). The goal is one Laravel app that server-renders the React UI through Inertia SSR, with Sanctum **cookie-session** auth replacing the localStorage token. That gives one deploy, same origin with no proxy, HttpOnly auth, and server-rendered first paint.

**Scope reality check.** The client has ~218 TS/TSX files, 7 routes (`main-layout.tsx:109-130`: `/`, `/patients/:patientId`, `/caseload`, `/cases/:caseId`, `/reports`, `/reports/social-cases`, `/audit`), ~20 files that touch `window`/`document`/`localStorage`, and a data layer built on 161 `/api` routes. A full rewrite to "Inertia props only" would take weeks and would duplicate the API. So the recommended design is **hybrid Inertia**:
- Inertia owns **routing, auth, shared props (user, permissions, roles), and each page's primary data** (the props are rendered on the server).
- The existing `/api` + TanStack Query layer stays for tab data, mutations, and invalidation. It is seeded from Inertia props through `initialData` under the same query keys, so `patientDetailKeys` invalidation keeps working unchanged.

The work is phased so the app stays working after every phase. Track it in a new `zcmc_mswd_server/docs/INERTIA_SSR_MIGRATION_PLAN.md` with a per-phase status table (the existing `docs/` convention).

---

## Phase 0: Toolchain alignment (server repo)

- The server's `package.json` has Vite 7 and `laravel-vite-plugin` ^2. The client uses Vite 8, `@vitejs/plugin-react` 6, and TS 6. Upgrade to a `laravel-vite-plugin` release that supports Vite 8, or pin both to Vite 7 if it doesn't exist yet. Check this at implementation time.
- Merge the client's `dependencies`/`devDependencies` into the server's `package.json`, and drop `axios` unless something uses it. Copy over `tsconfig*.json`, `eslint.config.js`, `.prettierrc`, and `components.json` (update the shadcn `aliases` / `tailwind.css` path to `resources/css/app.css`).
- Add `typecheck`, `lint`, and `format` scripts to the server's `package.json`.

## Phase 1: Host the SPA inside Laravel (no Inertia yet, bearer auth unchanged)

This is a low-risk checkpoint: the same app, now served by Laravel.

- Move `zcmc_mswd_client/src/*` to `zcmc_mswd_server/resources/js/`, and `src/index.css` to `resources/css/app.css` (replace the stock one). Delete the dead `components/mswd/` and `data/patients-data.ts` instead of carrying them over.
- `vite.config.js` becomes `vite.config.ts`: `laravel({ input: ['resources/css/app.css', 'resources/js/main.tsx'], refresh: true })`, `react()`, `tailwindcss()`, alias `@` to `resources/js`. Remove the `/api` proxy.
- New Blade shell `resources/views/app.blade.php` with `@viteReactRefresh @vite([...])` and `<div id="root">`.
- `routes/web.php`: replace `welcome` with a catch-all `Route::view('/{any?}', 'app')->where('any', '^(?!api|admin|up|storage|docs|filament|livewire).*$')`. Filament, the API, the health check, and l5-swagger all have to keep resolving.
- **Verify:** `composer dev`, open `http://127.0.0.1:8000`, log in, and click through all 7 routes and the patient tabs.

## Phase 2: Sanctum cookie-session auth

- `bootstrap/app.php`: `$middleware->statefulApi()`. In `.env`, set `SANCTUM_STATEFUL_DOMAINS` (localhost:8000, the prod host) and `SESSION_DOMAIN`. Check `config/session.php` (`same_site=lax`, `secure` in prod).
- Login/logout as **web** routes (`POST /login`, `POST /logout`) using `Auth::attempt` + `session()->regenerate()`, throttled the way `LoginController` is today (`throttle:6,1`). Keep the existing token `LoginController` only if a non-browser consumer needs it (ask). Otherwise delete it and revoke stored tokens.
- `resources/js/lib/api-client.ts`: drop `getToken`/`setToken` and the `Authorization` header. Send `credentials: "same-origin"` plus `X-XSRF-TOKEN` read from the `XSRF-TOKEN` cookie, and `Accept: application/json`. On 401/419, reload to `/login` instead of clearing the token. Keep the `ApiError` mapping and the `filters` logic as they are.
- Every `auth:sanctum` API route keeps working, because Sanctum accepts the session cookie for stateful origins.
- **Verify:** log in, refresh (the session persists), an API write succeeds (CSRF ok), logout invalidates. Pest feature test: an unauthenticated `/api/patients` returns 401, and an authenticated session returns 200.

## Phase 3: Inertia (client-side rendering first)

**Server**
- `composer require inertiajs/inertia-laravel`, then `php artisan inertia:middleware`, and append `HandleInertiaRequests` to the `web` group.
- `HandleInertiaRequests::share()`: `auth.user` (the same shape `/me` returns now), `auth.permissions`, `auth.roles`, `flash`. This replaces the `/me` round-trip that `useAuth`/`usePermission` make today. The permission strings stay identical, since they come from the same spatie source.
- Rename the root view to `app.blade.php` with `@inertia @inertiaHead`.
- `routes/web.php`: `guest` → `GET /login` (`Inertia::render('Auth/Login')`). `auth` group → one controller per page: `PatientsIndex` (`/`), `PatientShow` (`/patients/{patient}`), `Caseload`, `CaseShow` (`/cases/{case}`), `Reports`, `Audit`. Gate them with the same `permission:` middleware names the API uses. Each controller passes the page's primary data by **reusing the existing API Resource classes** (`XResource::make($m)->resolve()`), so the props have the same shape the `*-api.ts` functions already unwrap. Example: `PatientsIndex` passes the first page of the patient list plus filters from the query string, and `PatientShow` also passes the patient resource.
- Drop the catch-all route from Phase 1.

**Client**
- `npm i @inertiajs/react`, remove `react-router`.
- New `resources/js/app.tsx`: `createInertiaApp({ resolve: name => resolvePageComponent(\`./pages/${name}.tsx\`, import.meta.glob('./pages/**/*.tsx')), setup })`. Wrap it in `QueryClientProvider`, `ThemeProvider`, and `TooltipProvider`, with `MainLayout` as a persistent layout (`Page.layout`) so the sidebar and master list don't remount between visits.
- `resources/js/pages/`: thin page components (`Auth/Login`, `Patients/Index`, `Patients/Show`, `Cases/Caseload`, `Cases/Show`, `Reports/Index`, `Audit/Index`) that render the existing feature components. `App.tsx`'s auth gate goes away, because the server redirects guests.
- Replace `useNavigate`/`Link`/`useParams`/`useSearchParams` in the ~10 router-using files (`main-layout.tsx`, `sidebar.tsx`, `caseload-page.tsx`, `case-detail-page.tsx`, `patient-detail-view.tsx`, `social-case-tab.tsx`, `uis-tab.tsx`, `hospital-encounter-detail-dialog.tsx`, `profile-form-dialog.tsx`) with Inertia's `Link`, `router.visit`, and page props. Patient selection and list filters in `usePatients` become URL query params driven by `router.get(..., { preserveState: true, preserveScroll: true })`.
- `useAuth`/`usePermission`/`useAnyPermission`/`useHasRole` read `usePage().props.auth` instead of querying `/me`. Keep the hook signatures so call sites don't change.
- Seed TanStack: page components pass props as `initialData` (with `initialDataUpdatedAt`) to the existing `useQuery` calls under the existing keys (`patientDetailKeys`, etc.). All writes in `use-patient-writes.ts` / `use-caretaker-writes.ts` and the other mutation hooks stay as they are. The `patients-adapter.ts` rules (`NOT_ON_FILE`/`NOT_TRACKED`, "most recent case") still apply. The adapter runs on server props just as it runs on API responses.
- Login form posts with Inertia `useForm().post('/login')`. Validation errors come back as props.
- **Verify:** all 7 pages, deep links, refresh on `/patients/123?tab=family`, browser back/forward, permission-gated pages (a `patients.view`-only user still degrades gracefully), and a mutation followed by invalidation.

## Phase 4: SSR

- `resources/js/ssr.tsx`: `createServer(page => createInertiaApp({ page, render: ReactDOMServer.renderToString, resolve, setup }))`, with a fresh `QueryClient` per request. Add `ssr: 'resources/js/ssr.tsx'` to the laravel vite plugin, and a build script `vite build && vite build --ssr`.
- `config/inertia.php`: enable `ssr`. Run `php artisan inertia:start-ssr` (add it to `composer dev`'s concurrently list).
- **SSR-safety audit** of the ~20 files that use `window`/`document`/`localStorage`/`matchMedia` (e.g. `providers/theme-provider.tsx`, `hooks/use-mobile.ts`, `components/ui/sidebar.tsx`, the PDF preview dialogs, `uis-print-api.ts`): move access into `useEffect`, or guard with `typeof window !== "undefined"`. Blob/print/PDF code runs only in event handlers, so that's fine.
- **Theme without a flash:** persist the theme in a cookie (in addition to localStorage). The server reads it in `HandleInertiaRequests`, shares it, and Blade puts `class="dark"` on `<html>`. Add a tiny inline script for the `system` mode. The sidebar open state already uses a cookie (shadcn).
- Heavy client-only widgets (recharts in reports, `react-resizable-panels` sizes from storage, `react-day-picker` popovers) render a skeleton on the server if they mismatch on hydration.
- **Verify:** `curl -s http://127.0.0.1:8000/` with a session cookie returns real markup (not an empty `#root`). There are no hydration warnings in the browser console on any page. Stop the SSR process and confirm Inertia falls back to CSR cleanly.

## Phase 5: Deployment and cleanup

- Production: run `node bootstrap/ssr/ssr.js` (via `php artisan inertia:start-ssr`) under supervisor/systemd/NSSM (Windows), and add `php artisan inertia:stop-ssr` to the deploy hook so new builds get picked up. Node must be installed on the prod server.
- Archive the `zcmc_mswd_client` repo, with its README pointing to the server repo. Optionally bring over its git history with `git subtree add --prefix=resources/js` (decide at Phase 1).
- Move the live client plan docs (`API_CONTRACT_SYNC_PLAN.md`, `PATIENT_CARETAKE_PLAN.md`, `WATCHER_*`) into the server's `docs/` and merge them with their server counterparts.
- Update the server's `CLAUDE.md` and README with the new architecture (Inertia pages layer, hybrid data rule, cookie auth, SSR process), and move over the client conventions (Base UI not Radix, prettier rules, feature folders, adapter rules).

---

## shadcn/ui: stays as-is

shadcn components are plain source files in `components/ui/`, so they move with the rest of the code unchanged: same Base UI primitives, same `base-mira`/`mist` style, same oklch tokens, same fonts. Only the configuration changes:
- `components.json`: `tailwind.css` becomes `resources/css/app.css`. The aliases keep `@/components/ui` etc., because `@` now points to `resources/js`. `npx shadcn@latest add <name>` then runs from the server repo root.
- Tailwind v4 has to scan `resources/js/**`. The vite plugin auto-detects it; add `@source "../js"` in `app.css` if any classes go missing. Keep Filament's own theme CSS separate so the two token sets don't collide.
- For SSR, Base UI renders on the server fine. Only components that read browser state need the Phase 4 guards: `sidebar.tsx` (`useIsMobile`), the theme provider, and portals/toasts, which already mount on the client.

## Critical files

**Server:** `bootstrap/app.php`, `routes/web.php`, `routes/api.php` (login/logout move), `app/Http/Middleware/HandleInertiaRequests.php` (new), `app/Http/Controllers/Web/*` (new page controllers, reusing `app/Http/Resources/*`), `config/sanctum.php`, `config/session.php`, `config/inertia.php`, `resources/views/app.blade.php`, `vite.config.ts`, `package.json`.

**Client (moved to `resources/js/`):** `main.tsx` → `app.tsx` + `ssr.tsx`, `App.tsx` (removed), `lib/api-client.ts`, `features/auth/hooks/use-auth.ts` + `use-permission.ts`, `features/patients/hooks/use-patients.ts` + `use-patient-detail.ts`, `components/layout/main-layout.tsx` + `sidebar.tsx`, `providers/theme-provider.tsx`, plus the router-using files listed in Phase 3.

## Verification (end-to-end, per phase and at the end)

- `npm run typecheck && npm run lint && npm run build` (client + SSR bundles).
- `composer test`: Pest feature tests for the web routes (guest → redirect to `/login`, permission-gated pages return 403 / degrade), cookie auth on `/api`, and Inertia responses (`assertInertia(fn ($p) => $p->component('Patients/Show')->has('patient'))`).
- Manual run-through in the browser pane against `composer dev`: log in/out, all 7 pages, patient tabs CRUD (family, watchers, caretake, socioeconomic, UIS print/PDF), Filament `/admin` still works, view-source shows SSR markup, no hydration errors in the console, dark mode shows no flash on refresh.
