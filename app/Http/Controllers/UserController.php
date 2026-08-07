<?php

namespace App\Http\Controllers;

use App\Http\Requests\SyncUserRolesRequest;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class UserController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $users = User::query()
            ->with('roles')
            ->orderBy('employee_name')
            ->paginate();

        return UserResource::collection($users);
    }

    public function show(User $user): UserResource
    {
        return UserResource::make($user->load('roles', 'permissions'));
    }

    /**
     * Replace the user's roles with the given set, then refresh the role cache.
     */
    public function syncRoles(SyncUserRolesRequest $request, User $user): UserResource
    {
        $user->syncRoles($request->validated('roles'));
        $user->syncRoleCache();

        return UserResource::make($user->load('roles', 'permissions'));
    }
}
