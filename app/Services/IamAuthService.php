<?php

namespace App\Services;

use App\Exceptions\IamSignInException;
use App\Models\Role;
use App\Models\User;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;

/**
 * Sign-in through ZCMC IAM (OAuth2 authorization code + PKCE). The code
 * exchange happens here, on the server, where the client secret is safe.
 */
class IamAuthService
{
    private const SESSION_KEYS = [
        'iam_access_token',
        'iam_refresh_token',
        'iam_expires_at',
    ];

    /**
     * Start a sign-in: keep a PKCE verifier and a state value in the session
     * and return the IAM authorize URL to send the browser to.
     */
    public function authorizationUrl(Request $request): string
    {
        $verifier = bin2hex(random_bytes(32));
        $challenge = rtrim(strtr(base64_encode(hash('sha256', $verifier, true)), '+/', '-_'), '=');
        $state = bin2hex(random_bytes(16));

        $request->session()->put([
            'iam_oauth_verifier' => $verifier,
            'iam_oauth_state' => $state,
        ]);

        $maxAge = config('services.iam.max_age');

        $query = http_build_query([
            'client_id' => config('services.iam.client_id'),
            'redirect_uri' => config('services.iam.redirect_uri'),
            'response_type' => 'code',
            'scope' => 'openid profile email',
            'state' => $state,
            'code_challenge' => $challenge,
            'code_challenge_method' => 'S256',
            ...($maxAge === null || $maxAge === '' ? [] : ['max_age' => (int) $maxAge]),
        ]);

        return $this->baseUrl().'/oauth/authorize?'.$query;
    }

    /**
     * Finish a sign-in from IAM's callback and log the person in.
     *
     * @throws IamSignInException
     */
    public function signIn(Request $request): User
    {
        if ($request->filled('error')) {
            throw new IamSignInException($this->refusalMessage((string) $request->query('error')));
        }

        $state = (string) $request->session()->pull('iam_oauth_state');
        $verifier = (string) $request->session()->pull('iam_oauth_verifier');

        if ($state === '' || ! hash_equals($state, (string) $request->query('state'))) {
            throw new IamSignInException('That sign-in did not start here. Please try again.');
        }

        if (! $request->filled('code')) {
            throw new IamSignInException('IAM did not return a sign-in code. Please try again.');
        }

        try {
            $tokenResponse = Http::asForm()->post($this->baseUrl().'/oauth/token', [
                'grant_type' => 'authorization_code',
                'client_id' => config('services.iam.client_id'),
                'client_secret' => config('services.iam.client_secret'),
                'redirect_uri' => config('services.iam.redirect_uri'),
                'code_verifier' => $verifier,
                'code' => $request->query('code'),
            ]);

            if ($tokenResponse->failed()) {
                // invalid_client is a wrong id or secret; unauthorized_client
                // means this system was never given the authorization_code grant.
                report(new IamSignInException('IAM refused the code exchange: '.$tokenResponse->json('error', 'unknown error')));

                throw new IamSignInException('IAM could not complete the sign-in. Contact your administrator.');
            }

            $tokens = $tokenResponse->json();

            $userResponse = Http::withToken($tokens['access_token'])
                ->acceptJson()
                ->get($this->baseUrl().'/api/v1/userinfo');
        } catch (ConnectionException) {
            throw new IamSignInException('IAM is unreachable right now. Please try again shortly.');
        }

        if ($userResponse->failed()) {
            throw new IamSignInException('IAM would not say who signed in. Please try again.');
        }

        $user = $this->provisionUser($userResponse->json());

        if (! $user->is_active) {
            throw new IamSignInException('This account is inactive. Please contact your administrator.');
        }

        Auth::login($user);
        $request->session()->regenerate();

        $this->storeTokens($request, $tokens);

        return $user;
    }

    /**
     * Whether IAM still vouches for this session. Renews the access token a
     * minute before it dies; a failed renewal means the person was revoked.
     * Sessions that did not come from IAM (the super admin) are left alone.
     */
    public function stillSignedIn(Request $request): bool
    {
        $expiresAt = $request->session()->get('iam_expires_at');

        if ($expiresAt === null) {
            return true;
        }

        if (now()->lt($expiresAt->copy()->subMinute())) {
            return true;
        }

        $refreshToken = $request->session()->get('iam_refresh_token');

        if ($refreshToken === null) {
            return false;
        }

        try {
            $response = Http::asForm()->post($this->baseUrl().'/oauth/token', [
                'grant_type' => 'refresh_token',
                'refresh_token' => $refreshToken,
                'client_id' => config('services.iam.client_id'),
                'client_secret' => config('services.iam.client_secret'),
            ]);
        } catch (ConnectionException) {
            // IAM being down is not proof the person was revoked; let the
            // session ride until the token itself runs out.
            return now()->lt($expiresAt);
        }

        if ($response->failed()) {
            return false;
        }

        $this->storeTokens($request, $response->json(), $refreshToken);

        return true;
    }

    /**
     * End the local session. Returns the IAM logout URL to send the browser
     * to when the IAM session should end too, otherwise null.
     */
    public function signOut(Request $request): ?string
    {
        $cameFromIam = $request->session()->has('iam_expires_at');

        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        if (! $cameFromIam || ! config('services.iam.end_iam_session_on_logout')) {
            return null;
        }

        return $this->baseUrl().'/oauth/logout?'.http_build_query([
            'client_id' => config('services.iam.client_id'),
            'post_logout_redirect_uri' => url('/login'),
        ]);
    }

    /**
     * Find or create the local record for whoever just signed in, and put
     * their roles where local authorization can see them.
     *
     * Keyed on the IAM subject, never the email address: the roster shares
     * addresses between employees.
     *
     * @param  array<string, mixed>  $claims
     */
    private function provisionUser(array $claims): User
    {
        $user = User::firstOrNew(['iam_sub' => (string) $claims['sub']]);

        $user->fill([
            'employee_name' => $claims['name'] ?? $claims['email'] ?? (string) $claims['sub'],
            'email' => $claims['email'] ?? '',
            'placement' => $claims['placement'] ?? null,
            // The hospital's posts (officer-in-charge...), scoped to an area.
            // Kept apart from `roles`: a post whose name matched a local role
            // must never become that role.
            'iam_org_roles' => $claims['org_roles'] ?? [],
        ]);

        if (! $user->exists) {
            $user->is_active = true;
        }

        $user->save();

        // Every sign-in, and unconditionally, so a role withdrawn in IAM does
        // not linger here.
        $user->syncRoles($this->rolesFrom($claims['roles'] ?? []));
        $user->syncRoleCache();

        return $user;
    }

    /**
     * Translate IAM role values into local role names. A value matches a local role
     * by its system code (`case_manager`) first, then by name; values with no local
     * role are dropped rather than created, and IAM can never grant the super admin
     * role: that one is held only by local password accounts.
     *
     * @param  array<int, string>  $iamRoles
     * @return array<int, string>
     */
    private function rolesFrom(array $iamRoles): array
    {
        /** @var array<string, string> $map */
        $map = config('services.iam.role_map', []);

        $local = Role::query()
            ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
            ->where('code', '!=', RolesAndPermissionsSeeder::SUPER_ADMIN_CODE)
            ->get(['name', 'code']);

        $names = [];

        foreach ($iamRoles as $value) {
            $value = $map[$value] ?? $value;
            $match = $local->firstWhere('code', $value) ?? $local->firstWhere('name', $value);

            if ($match !== null) {
                $names[] = $match->name;
            }
        }

        return array_values(array_unique($names));
    }

    /**
     * @param  array<string, mixed>  $tokens
     */
    private function storeTokens(Request $request, array $tokens, ?string $fallbackRefresh = null): void
    {
        $request->session()->put([
            'iam_access_token' => $tokens['access_token'],
            'iam_refresh_token' => $tokens['refresh_token'] ?? $fallbackRefresh,
            // Keep the moment it dies, not the seconds it was given.
            'iam_expires_at' => now()->addSeconds((int) $tokens['expires_in']),
        ]);
    }

    private function refusalMessage(string $error): string
    {
        return match ($error) {
            'access_denied' => 'You are not admitted to this system. Ask an administrator for access.',
            'login_required' => 'Your IAM sign-in has expired. Please sign in again.',
            default => 'IAM refused the sign-in ('.$error.').',
        };
    }

    private function baseUrl(): string
    {
        return rtrim((string) config('services.iam.base_url'), '/');
    }
}
