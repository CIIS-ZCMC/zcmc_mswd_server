<?php

namespace App\Http\Controllers\Web;

use App\Http\Controllers\Controller;
use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\IamAuthService;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

class AuthController extends Controller
{
    public function __construct(private readonly IamAuthService $iam) {}

    /**
     * Send visitors straight to ZCMC IAM. The page itself only renders to report a
     * failed sign-in (so a refusal cannot loop back to IAM) or, at `/login?admin`,
     * for the local super admin's password form.
     */
    public function showLogin(Request $request): Response|RedirectResponse
    {
        if (Auth::check()) {
            return redirect()->intended('/');
        }

        $iamError = session('iam_error');
        $admin = $request->has('admin');

        if ($iamError === null && ! $admin) {
            return redirect()->route('iam.redirect');
        }

        return Inertia::render('Auth/Login', [
            'iamError' => $iamError,
            'adminLogin' => $admin,
        ]);
    }

    /**
     * Authenticate the local super admin by password. Everyone else signs in
     * through ZCMC IAM, so any other account is refused with the same message
     * as a wrong password.
     */
    public function login(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::where('employee_number', $request->validated('employee_number'))->first();

        if (
            ! $user
            || ! $user->hasRoleCode(RolesAndPermissionsSeeder::SUPER_ADMIN_CODE)
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
     * Log out the session. `redirect` is the IAM logout URL when the IAM
     * session should end too; the client must navigate to it for real, since
     * an XHR cannot follow a redirect across origins.
     */
    public function logout(Request $request): JsonResponse
    {
        return response()->json(['redirect' => $this->iam->signOut($request)]);
    }
}
