<?php

namespace App\Http\Controllers;

use App\Http\Requests\SyncUserRolesRequest;
use App\Http\Resources\UserResource;
use App\Models\User;

class SyncUserRolesController extends Controller
{
    /**
     * Replace the user's roles with the given set, then refresh the role cache.
     */
    public function __invoke(SyncUserRolesRequest $request, User $user): UserResource
    {
        $user->syncRoles($request->validated('roles'));
        $user->syncRoleCache();

        return UserResource::make($user->load('roles', 'permissions'));
    }
}
