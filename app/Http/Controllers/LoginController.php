<?php

namespace App\Http\Controllers;

use App\Http\Requests\LoginRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class LoginController extends Controller
{
    /**
     * Authenticate by employee number + password and issue a Sanctum API token:
     * the local super admin, or anyone under the `local` provider
     * (User::canSignInWithPassword). Everyone else signs in through UMIS or IAM.
     * The client sends the token as `Authorization: Bearer <token>`.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::where('employee_number', $request->validated('employee_number'))->first();

        if (
            ! $user
            || ! $user->canSignInWithPassword()
            || ! Hash::check($request->validated('password'), (string) $user->password)
        ) {
            // Same message for unknown employee number and wrong password (no user enumeration).
            throw ValidationException::withMessages([
                'employee_number' => 'These credentials do not match our records.',
            ]);
        }

        if (! $user->is_active) {
            throw ValidationException::withMessages([
                'employee_number' => 'This account is inactive. Please contact your administrator.',
            ]);
        }

        $token = $user->createToken($request->validated('device_name', 'api'))->plainTextToken;

        return UserResource::make($user->load('roles'))
            ->additional(['token' => $token, 'token_type' => 'Bearer'])
            ->response();
    }
}
