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
     * Authenticate a user by employee number + password and issue a Sanctum
     * API token. React stores the token and sends it as
     * `Authorization: Bearer <token>`.
     */
    public function __invoke(LoginRequest $request): JsonResponse
    {
        /** @var User|null $user */
        $user = User::where('employee_number', $request->validated('employee_number'))->first();

        if (! $user || ! Hash::check($request->validated('password'), $user->password)) {
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
