<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:users.view'),
        ];
    }

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
}
