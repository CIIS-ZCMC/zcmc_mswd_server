<?php

namespace App\Services;

use App\Exceptions\UmisSignInException;
use App\Models\User;
use App\Support\ExternalRoleMatcher;
use App\Support\UmisPayload;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Sign-in through UMIS. Staff sign in on the ZCMC Portal (UMIS's landing page)
 * and pick MSWD; UMIS sends the browser to /signing-in/{session_id}. This
 * server swaps that id for the person and their MSWD roles at UMIS
 * (`POST /api/auth-with-session-id`, authenticated by MSWD's API key), so the
 * browser never carries anything UMIS has to trust.
 *
 * The same id answers 401 once the person signs out of UMIS, which is how a
 * live session here learns it has ended.
 */
class UmisAuthService
{
    private const SESSION_ID = 'umis_session_id';

    private const CHECKED_AT = 'umis_checked_at';

    private const OK = 'ok';

    /** UMIS says no: the person is not (or no longer) admitted. */
    private const REFUSED = 'refused';

    /** UMIS could not answer; says nothing about the person. */
    private const UNAVAILABLE = 'unavailable';

    /**
     * Swap a UMIS session id for the person and log them in.
     *
     * @throws UmisSignInException
     */
    public function signIn(Request $request, string $sessionId): User
    {
        // A shared ward terminal: whoever was signed in leaves first, whatever
        // happens next, so a failed hand-off never leaves them signed in.
        if (Auth::guard('web')->check()) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();
        }

        [$outcome, $result] = $this->lookUp($sessionId);

        if ($outcome !== self::OK) {
            throw new UmisSignInException($result);
        }

        $user = $this->provisionUser($result);

        if (! $user->is_active) {
            throw new UmisSignInException('This account is inactive. Please contact your administrator.');
        }

        Auth::login($user);
        $request->session()->regenerate();

        $request->session()->put([
            self::SESSION_ID => $sessionId,
            self::CHECKED_AT => now()->getTimestamp(),
        ]);

        return $user;
    }

    /**
     * Whether UMIS still vouches for this session. Asks at most every
     * `recheck_minutes`, and picks up role changes when it does. UMIS being
     * down or erroring is not proof the person was signed out, so the session
     * rides until UMIS answers. Sessions that did not come from UMIS pass.
     */
    public function stillSignedIn(Request $request): bool
    {
        $sessionId = $request->session()->get(self::SESSION_ID);

        if ($sessionId === null) {
            return true;
        }

        $checkedAt = (int) $request->session()->get(self::CHECKED_AT, 0);
        $every = max(1, (int) config('services.umis.recheck_minutes')) * 60;

        if (now()->getTimestamp() < $checkedAt + $every) {
            return true;
        }

        [$outcome, $result] = $this->lookUp((string) $sessionId);

        // Stamp even when UMIS is down, so every request does not wait on it.
        $request->session()->put(self::CHECKED_AT, now()->getTimestamp());

        if ($outcome === self::UNAVAILABLE) {
            return true;
        }

        if ($outcome === self::REFUSED) {
            return false;
        }

        /** @var User|null $current */
        $current = $request->user();

        // The id must still name the person this session belongs to.
        if ($current === null || (int) $result['user_details']['employee_profile_id'] !== (int) $current->employee_id) {
            return false;
        }

        return $this->provisionUser($result)->is_active;
    }

    /**
     * End the local session. Returns the ZCMC Portal URL to send the browser
     * back to when the session came from UMIS, otherwise null. UMIS has no
     * logout for other systems, so the portal session itself stays open.
     */
    public function signOut(Request $request): ?string
    {
        $cameFromUmis = $request->session()->has(self::SESSION_ID);

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        $portal = config('services.umis.portal_url');

        return $cameFromUmis && is_string($portal) && $portal !== '' ? $portal : null;
    }

    public function cameFromUmis(Request $request): bool
    {
        return $request->hasSession() && $request->session()->has(self::SESSION_ID);
    }

    /**
     * Ask UMIS who a session id belongs to.
     *
     * @return array{0: string, 1: mixed} [outcome, the decoded reply when OK or
     *                                    the message to show the person otherwise]
     */
    private function lookUp(string $sessionId): array
    {
        try {
            $response = Http::baseUrl($this->baseUrl())
                ->timeout(max(1, (int) config('services.umis.timeout')))
                ->acceptJson()
                ->withHeaders(['UMIS-Api-Key' => (string) config('services.umis.api_key')])
                ->withQueryParameters(['session_id' => $sessionId])
                ->post('api/auth-with-session-id');
        } catch (ConnectionException) {
            return [self::UNAVAILABLE, 'The ZCMC Portal is unreachable right now. Please try again shortly.'];
        }

        if ($response->status() === 401) {
            return [self::REFUSED, 'Your ZCMC Portal sign-in has ended. Please sign in on the portal again.'];
        }

        if ($response->serverError()) {
            // UMIS also answers 500 when the person holds no MSWD role at all.
            report(new RuntimeException('UMIS session lookup failed with HTTP '.$response->status().'.'));

            return [self::UNAVAILABLE, 'The ZCMC Portal could not confirm your access to MSWD. If this keeps happening, ask an administrator to check your MSWD role.'];
        }

        if ($response->failed()) {
            // 404: UMIS does not recognise the API key; 403: the key is deactivated.
            report(new RuntimeException('UMIS refused MSWD\'s API key with HTTP '.$response->status().'; check UMIS_API_KEY.'));

            return [self::REFUSED, 'The ZCMC Portal refused this sign-in. Contact your administrator.'];
        }

        try {
            $payload = UmisPayload::decode($response->json(), config('services.umis.payload_key'));
        } catch (RuntimeException $e) {
            report($e);

            return [self::UNAVAILABLE, 'MSWD could not read the ZCMC Portal reply. Contact your administrator.'];
        }

        // UMIS answers with another system's details (or none) when the person
        // has no MSWD role.
        if (data_get($payload, 'permissions.code') !== config('services.umis.system_code')) {
            return [self::REFUSED, 'You are not admitted to MSWD. Ask an administrator for access.'];
        }

        if (! is_numeric(data_get($payload, 'user_details.employee_profile_id'))) {
            report(new RuntimeException('UMIS session lookup returned no employee_profile_id.'));

            return [self::UNAVAILABLE, 'The ZCMC Portal did not say who signed in. Please try again.'];
        }

        return [self::OK, $payload];
    }

    /**
     * Find or create the local record for whoever UMIS named, and put their
     * MSWD roles where local authorization can see them.
     *
     * Keyed on the UMIS user id (`employee_profile_id`), never the email
     * address: the roster shares addresses between employees.
     *
     * @param  array<string, mixed>  $payload
     */
    private function provisionUser(array $payload): User
    {
        /** @var array<string, mixed> $details */
        $details = $payload['user_details'];

        $user = User::firstOrNew(['employee_id' => (int) $details['employee_profile_id']]);

        $user->fill([
            'employee_number' => $this->employeeNumber($details['employee_id'] ?? null),
            'employee_name' => trim((string) ($details['name'] ?? '')) ?: 'Employee '.($details['employee_id'] ?? $details['employee_profile_id']),
            'email' => (string) (data_get($details, 'employee_details.contact.email_address') ?? ''),
            'position' => $details['designation'] ?? null,
            'placement' => $details['area_assigned'] ?? null,
            'synced_at' => now(),
        ]);

        if (! $user->exists) {
            $user->is_active = true;
        }

        $user->save();

        /** @var array<string, string> $map */
        $map = config('services.umis.role_map', []);
        $names = collect(data_get($payload, 'permissions.roles', []))
            ->pluck('name')
            ->filter(fn ($name) => is_string($name))
            ->values()
            ->all();

        // Every time, and unconditionally, so a role withdrawn in UMIS does not
        // linger here.
        $user->syncRoles(ExternalRoleMatcher::match($names, $map));
        $user->syncRoleCache();

        return $user;
    }

    /**
     * UMIS keeps the employee number as text; MSWD keeps it as an integer.
     * Anything that is not a plain number that fits is left out rather than
     * mangled.
     */
    private function employeeNumber(mixed $value): ?int
    {
        $value = is_scalar($value) ? trim((string) $value) : '';

        if ($value === '') {
            return null;
        }

        if (! ctype_digit($value) || (int) $value > 2147483647) {
            report(new RuntimeException("UMIS employee number [{$value}] is not a whole number MSWD can store."));

            return null;
        }

        return (int) $value;
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.umis.base_url'), '/');
    }
}
