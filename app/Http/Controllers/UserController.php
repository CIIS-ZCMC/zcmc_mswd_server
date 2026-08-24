<?php

namespace App\Http\Controllers;

use App\Http\Resources\UserResource;
use App\Models\User;
use App\Services\UserService;
use App\Support\ListQuery;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class UserController extends Controller implements HasMiddleware
{
    public function __construct(protected UserService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:users.view'),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        return UserResource::collection($this->service->list(ListQuery::fromRequest($request)));
    }

    public function show(User $user): UserResource
    {
        return UserResource::make($user->load('roles', 'permissions'));
    }
}
