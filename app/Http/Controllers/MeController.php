<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Request;

class MeController extends Controller
{
    /**
     * The user behind the current token, in the same shape the login response
     * returns. The React client calls this on boot to turn a stored token back
     * into a session, so roles and permissions must be present here too.
     */
    public function __invoke(Request $request): UserResource
    {
        /** @var User $user */
        $user = $request->user();

        return UserResource::make($user->load('roles', 'permissions'));
    }
}
