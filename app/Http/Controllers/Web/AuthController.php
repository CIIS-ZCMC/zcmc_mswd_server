<?php

namespace App\Http\Controllers\Web;

use App\Enums\AuthProvider;
use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\IamAuthService;
use App\Services\UmisAuthService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Symfony\Component\HttpFoundation\Response as SymfonyResponse;

class AuthController extends Controller
{
    public function __construct(
        private readonly IamAuthService $iam,
        private readonly UmisAuthService $umis,
    ) {}

    /**
     * Send visitors straight to where staff sign in: ZCMC IAM, or the ZCMC Portal
     * under UMIS (when its URL is set). The page itself only renders to report a
     * failed sign-in (so a refusal cannot loop back) or, at `/login?admin`, for
     * the local super admin's password form. Under the `local` provider the
     * password form is the sign-in, so it always renders.
     */
    public function showLogin(Request $request): Response|SymfonyResponse
    {
        if (Auth::check()) {
            return redirect()->intended('/');
        }

        $provider = AuthProvider::current();
        $authError = session('auth_error');
        $admin = $request->has('admin') || $provider === AuthProvider::Local;

        if ($authError === null && ! $admin) {
            $portal = config('services.umis.portal_url');

            if ($provider === AuthProvider::Iam) {
                return redirect()->route('iam.redirect');
            }

            if ($provider === AuthProvider::Umis && is_string($portal) && $portal !== '') {
                // Another origin: Inertia::location makes an Inertia visit leave
                // for real instead of an XHR dying on CORS.
                return Inertia::location($portal);
            }
        }

        return Inertia::render('Auth/Login', [
            'authError' => $authError,
            'adminLogin' => $admin,
        ]);
    }

    /**
     * Authenticate by password: the local super admin, or anyone under the
     * `local` provider (User::canSignInWithPassword). Under UMIS or IAM any
     * other account is refused with the same message as a wrong password.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::where('employee_number', $request->validated('employee_number'))->first();

        if (
            ! $user
            || ! $user->canSignInWithPassword()
            || ! Hash::check($request->validated('password'), (string) $user->password)
        ) {
            throw ValidationException::withMessages([
                'employee_number' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'employee_number' => 'This account is inactive. Please contact your administrator.',
            ]);
        }

        Auth::login($user, $request->boolean('remember'));
        $request->session()->regenerate();

        return UserResource::make($user->load('roles'))->response();
    }

    /**
     * Log out the session. `redirect` is where the browser goes next: the ZCMC
     * Portal for a session that came from UMIS, or the IAM logout URL when the
     * IAM session should end too. The client must navigate to it for real, since
     * an XHR cannot follow a redirect across origins. Any other session just ends
     * here (`redirect` is null).
     */
    public function logout(Request $request): JsonResponse
    {
        $redirect = $this->umis->cameFromUmis($request)
            ? $this->umis->signOut($request)
            : $this->iam->signOut($request);

        return response()->json(['redirect' => $redirect]);
    }
}
