# Plan: Move MSWD sign-in from ZCMC IAM to UMIS

## Context

MSWD (`zcmc_mswd_server`) signs staff in through ZCMC IAM today. The hospital's sign-in lives in UMIS (`D:\System\user_management_server`), which already handles passwords, 2FA, new accounts and expired passwords. The UMIS landing page (`D:\System\umis-landing-page`) is where staff choose a system. So MSWD does not build any sign-in of its own. It needs three things:

1. **Turn IAM off**, behind a switch rather than deleting it (`AUTH_PROVIDER`).
2. **Accept the hand-off UMIS already does for other systems**: a `/signing-in/{session_id}` link that MSWD swaps for the user and roles.
3. **Put MSWD on the landing page**, so staff can actually click it.

Each phase is labelled with the layer it touches:
- **[Server]**: Laravel, in `zcmc_mswd_server`.
- **[Client]**: React, in `zcmc_mswd_server/resources/js`.
- **[UMIS]**: setup in the UMIS admin; no code.
- **[Landing]**: `umis-landing-page`, a separate repository with a separate PR.

The MSWD phases (1–3) share one branch, `feat/umis-auth`, from `master`, and one PR. Phase 0 writes the plan to `docs/UMIS_AUTH_PLAN.md`.

### Changes per repository
| Repository | Code changes? | What |
|---|---|---|
| `zcmc_mswd_server` | **Yes** | Phases 0–3: disable IAM, accept the UMIS hand-off, update the login page. |
| `user_management_server` (UMIS API) | **No** | `POST /api/auth-with-session-id`, the API-key check and the session ids already exist. |
| UMIS admin portal (`zcmc-portal-client`) | **No**, data only | Phase 4 uses screens that already exist: **Manage Systems** (`/systems`, register MSWD and generate its key), **System Roles** (`/system-roles`), **Assign Job Positions System Roles**, and **Assign Employee System Roles**. |
| `umis-landing-page` | **Yes, one file** | Phase 5: the MSWD tile in `StartPageBody.jsx`. |

The UMIS issues listed near the end would be UMIS code changes, but they are for the UMIS team and MSWD does not wait on them.

---

## Phase 0: Branch setup **[Server]**
1. Move the uncommitted password-login changes into the new branch. They are in `app/Models/User.php`, `app/Http/Controllers/LoginController.php` and `app/Http/Controllers/Web/AuthController.php`, and they add `User::canSignInWithPassword`, which lets any role use a password in `local`.
   1. `git stash push` those three files only.
   2. Create `feat/umis-auth` from `master`.
   3. `git stash pop`.
   4. Move the new method's doc comment so it is no longer wedged between `syncRoleCache`'s comment and `syncRoleCache`.

   The other ten modified files stay on `feat/queue-visit-lock`.
2. Write `docs/UMIS_AUTH_PLAN.md`.

## Phase 1: Disable IAM **[Server + Client]**
Done first, so MSWD has exactly one sign-in path before UMIS is added. Until Phase 2 lands, only the password login is open: Super Admin anywhere, any role in `local`.

**Server**
- `config/services.php`: `'auth_provider' => env('AUTH_PROVIDER', 'umis')`. The `iam` block stays as it is.
- `routes/web.php`: register `/auth/iam/redirect` and `/callback` only when `auth_provider === 'iam'`.
- `bootstrap/app.php`: keep `EnsureIamSessionIsLive`. It already passes through any session without `iam_expires_at`, so it does nothing once IAM is off, and any live IAM session still gets checked until it ends.
- `Web/AuthController`:
  - `showLogin`: redirect to IAM only when the provider is `iam`. Otherwise render `Auth/Login`.
  - `logout`: use `IamAuthService::signOut` only for an IAM session. Otherwise end the local session and return `{redirect: null}`.
  - Rename the `iam_error` flash to `auth_error`.
- `HandleInertiaRequests`: share `auth.provider`.
- Pull the role matching out of `IamAuthService::rolesFrom` into `app/Support/ExternalRoleMatcher.php`, so Phase 2 reuses it. It matches by code, then name, applies the map first, and never grants Super Admin. IAM's behaviour does not change.
- `.env.example`: add `AUTH_PROVIDER=umis`.

**Client**
- `features/auth/components/login-form.tsx` and `pages/Auth/Login.tsx`:
  - Show the IAM button only when `auth.provider === "iam"`.
  - Rename the `iamError` prop to `authError`.
  - "Administrator sign-in" stays.
- Shared prop types: add `auth.provider`.

**Tests**
- `IamAuthTest`: set `config(['services.auth_provider' => 'iam'])` in `beforeEach`. It should then pass unchanged.
- `ExampleTest`:
  - Under `iam`, `/login` redirects to IAM.
  - Under `umis`, it renders the page and the IAM routes return 404.
- New test: password login works for a non-super-admin in `local` and is refused outside `local`.

Done when IAM is unreachable with the default config, `AUTH_PROVIDER=iam` brings it back, and all checks pass.

## Phase 2: Accept the UMIS hand-off **[Server]**

### How UMIS hands a user over (it already works this way)
1. On every sign-in, and every time the landing page loads, UMIS creates a session id for each system the user has (`system_user_sessions`). The tile link is `{system domain}/signing-in/{session_id}`.
2. The user clicks MSWD, and the browser opens `{MSWD}/signing-in/{session_id}`.
3. MSWD's server calls `POST {UMIS}/api/auth-with-session-id?session_id=…` with the header `UMIS-Api-Key: <key>`. UMIS returns:
   - `user_details`: `employee_profile_id`, `employee_id`, `name`, `designation`, `area_assigned`, and `employee_details.contact.email_address`.
   - `permissions`: `{code, roles:[{id, name}], modules:[…]}`.
4. When the user signs out of UMIS, the session id is deleted, and calling step 3 again returns 401.

### What MSWD must handle
- **The reply is encrypted.** Every UMIS API reply, errors included, is `{"encrypted": true, "payload": base64(IV16 + AES-256-CBC)}`, using UMIS's `API_PAYLOAD_KEY` padded to 32 characters with `0` (`EncryptApiResponse`). Status codes are not encrypted. Do not use UMIS's `X-No-Encryption` bypass header.
- **The API key** is sent exactly as the UMIS systems screen shows it: the stored, encrypted string.
- **No MSWD access:** UMIS can return another system's `permissions` (public roles are not filtered), or a 500. Require `permissions.code === UMIS_SYSTEM_CODE`; anything else means no access.
- **Session ids** never expire until UMIS sign-out and travel in the URL. Swap the id once, redirect at once to a clean URL, and never log it.

### Changes
- **Config** (`config/services.php` → `umis`): `base_url` (`UMIS_API_URL`), `api_key` (`UMIS_API_KEY`), `payload_key` (`UMIS_PAYLOAD_KEY`), `system_code` (`UMIS_SYSTEM_CODE`, default `MSWD`), `portal_url` (`UMIS_PORTAL_URL`), `recheck_minutes` (`UMIS_RECHECK_MINUTES`, default 5), `timeout` (`UMIS_TIMEOUT`, default 10), and `role_map` (a plain PHP array). Add them all to `.env.example`.
- **Migration**: a unique index on `users.employee_id`, the UMIS sign-in key. NULLs are allowed, so super admins and old IAM rows are unaffected.
- **`app/Support/UmisPayload.php`**: decrypts a reply when it is `encrypted: true` and otherwise returns the JSON as it is. A wrong key throws a clear error.
- **`app/Exceptions/UmisSignInException.php`**.
- **`app/Services/UmisAuthService.php`**:
  - `signIn(Request, sessionId)`: call UMIS and decode the reply.
    - A 401 or a code mismatch means "not admitted". A 500 means "no access or UMIS error" and is reported. A connection error means "UMIS unreachable".
    - Otherwise: provision the user, refuse an inactive account, `Auth::login`, regenerate the session, and store `umis_session_id` and `umis_checked_at`.
  - `provisionUser`:
    - Match on `users.employee_id = employee_profile_id`, never email.
    - Fill `employee_name`, `position` (designation), `placement` (area), and `synced_at`.
    - `email` is the contact email, or `''` when there is none.
    - `employee_number` is stored only when UMIS's `employee_id` is all digits. It is a string in UMIS and an INT in MSWD; otherwise leave it null and report it.
    - Then `syncRoles` through `ExternalRoleMatcher` with `permissions.roles[*].name`, and `syncRoleCache()`.
  - `stillSignedIn(Request)`: every `recheck_minutes`, call UMIS again with the stored id. A 401 ends the session, a connection error keeps it, and a 200 re-syncs the roles.
    - *As built:* a 5xx also keeps the session (and is reported), because UMIS being broken is not proof the person signed out. Side effect: someone who loses **every** UMIS role, which UMIS answers with a 500, keeps their MSWD session until they sign out of UMIS. A reply for another system (lost MSWD role only) or one naming a different person ends it. The check time is stamped even when UMIS is down, so requests don't each wait on it.
  - `signOut(Request)`: end the local session and return `portal_url`.
- **`Web/UmisAuthController@callback`** on `GET /signing-in/{sessionId}`:
  - Accept only a uuid (`whereUuid`) and throttle it.
  - **Not guest-only:** if someone is already signed in (a shared ward terminal), end that session first.
  - Success → `intended('/')`; failure → `login` with `auth_error`.
- **`EnsureUmisSessionIsLive`**: appended to `web` and `api` next to the IAM one. It passes through sessions without `umis_session_id`.
- **`Web/AuthController`**: under `umis`, `showLogin` redirects guests to `portal_url` when it is set, and `logout` delegates to `UmisAuthService`. Share `umisPortalUrl` through Inertia.
  - *As built:* the redirect uses `Inertia::location`, so an Inertia visit leaves for real. The shared prop is `auth.portalUrl`. Logout sends only UMIS sessions to the portal; a password session gets `redirect: null`.

### Tests (`tests/Feature/UmisAuthTest.php`)
`Http::fake()` only. The fake replies are encrypted the way UMIS encrypts them, plus one plain reply. Cases:
- **Decryption:** an encrypted reply decodes, a plain one is read as is, and a wrong key fails clearly.
- **User record:** sign-in creates the user keyed on `employee_id`; an existing user is never matched by email; a non-numeric `employee_id` leaves `employee_number` null.
- **Roles:** replaced on every sign-in, unknown ones dropped, Super Admin never granted, `role_map` applied.
- **Refusals:** a 401, a 500 or a code mismatch is refused with nobody logged in; an inactive user is refused; a non-uuid id is rejected without calling UMIS.
- **Shared terminal:** opening a sign-in link while someone else is signed in signs in the new person.
- **Recheck:** a 401 logs out, a connection error keeps the session, a 200 re-syncs roles.
- **Logout and `/login`:** logout returns `portal_url`; `/login` redirects to the portal.

## Phase 3: MSWD login page **[Client]**
- `login-form.tsx`: under `umis`, show "Sign in through the ZCMC Portal", a plain `<a href={umisPortalUrl}>`. It is disabled with a note while the URL is not set. "Administrator sign-in" stays.
- `use-auth.ts` and `auth-api.ts`: logout already follows `{redirect}` with a full page navigation, so only comments and wording change.
- `CLAUDE.md`, Auth & Users: UMIS is the sign-in, IAM is behind `AUTH_PROVIDER`, plus the setup steps.

## Phase 4: Register MSWD in UMIS **[UMIS]**
Can run at any time; only Phase 6 needs it.
1. Create a system with code `MSWD` and domain = MSWD's `APP_URL`, and generate its API key. Put the key in `UMIS_API_KEY` exactly as the UMIS systems screen shows it.
2. Get UMIS's `API_PAYLOAD_KEY` for `UMIS_PAYLOAD_KEY`.
3. Create the MSWD roles **Processor, Case Manager, Supervisor, Head, Admin**, each with at least one module permission.
4. Assign the roles to designations or to people. Never mark an MSWD role public, or everyone gets it.

Done when a UMIS sign-in reply lists MSWD with a `/signing-in/{uuid}` url.

## Phase 5: Put MSWD on the landing page **[Landing]**
Separate repository, separate PR, and the landing page team signs off.
- **Why it's needed:** the landing page's tiles are hard-coded per system code in `src/components/StartPageBody/StartPageBody.jsx` (`medicalContent`: HMB, EC1, SIS, Referral; `adminContent`: PRM, PO, ERP, Telemedicine). Registering MSWD in UMIS does not show it.
- **Change:** add an MSWD tile to `medicalContent`, which also feeds the mobile `SegmentedButton` view.
  - Title "Medical Social Work (MSWD)", a short description and an icon.
  - `link: retrieveAdminAccess("MSWD")`, which looks up the user's MSWD system and returns its fresh `/signing-in/{uuid}` url.
  - **Render it only when the link is not null.** Other tiles show a dead `#` card for people without access; MSWD's should not.
- Tiles are plain same-tab links, so clicking one goes straight to MSWD's `/signing-in/{uuid}`.

Done when a user with an MSWD role sees the tile and lands in MSWD signed in, and a user without the role does not see it.

## Phase 6: End-to-end check **[all]**
1. In MSWD, run `npx tsc -p tsconfig.app.json --noEmit && npm run lint && composer test` and `vendor/bin/pint`.
2. Start a local UMIS with `php artisan serve --port=8001`. Set the landing page's `ENV` in `src/services/services.jsx` to `local` (it is hard-coded to `"production"`), then run `npm run dev` (port 3001).
3. Sign in on the landing page and click MSWD. You should land signed in with the right `auth.roleCodes`.
4. Sign out of UMIS. MSWD should log you out within `UMIS_RECHECK_MINUTES`.
5. Set `AUTH_PROVIDER=iam` and confirm the IAM flow comes back.

**Going live:** set `AUTH_PROVIDER=umis` in production only after Phase 5 is deployed. Until then, staff have no tile to reach MSWD through UMIS.

---

## Accepted limits
- A sign-in link sent by someone else signs you in as them. This comes from UMIS's design, and MSWD's header shows who is signed in.
- MSWD logout does not end the UMIS session, because UMIS has no logout for other systems.

## UMIS issues to report to its team (MSWD does not rely on them)
1. A session id is not tied to its system: any registered system's key can redeem another system's id.
2. Deactivated API keys still work (the check reads `deactivated_at`, but the column is `key_deactivated_at`), and system status is never checked.
3. `X-No-Encryption` lets any caller skip response encryption, and the payload key has a default written in the source.
4. Session ids are never cleaned up.

## Open items
- The landing page's production address for `UMIS_PORTAL_URL`. It is probably `https://zcmc.online`; in dev it is `http://localhost:3001`.
- `UMIS_API_KEY` and `UMIS_PAYLOAD_KEY` for each environment.
- The landing page team accepting the MSWD tile PR.
