<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\PermissionResource;
use App\Http\Resources\RoleResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class RoleController extends Controller
{
    public function index(): AnonymousResourceCollection
    {
        $roles = Role::query()
            ->with('permissions')
            ->orderBy('name')
            ->get();

        return RoleResource::collection($roles);
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = Role::create([
            'name' => $request->validated('name'),
            'guard_name' => config('auth.defaults.guard'),
        ]);

        $role->syncPermissions($request->validated('permissions', []));

        return RoleResource::make($role->load('permissions'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Role $role): RoleResource
    {
        return RoleResource::make($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        if ($request->has('name')) {
            $role->update(['name' => $request->validated('name')]);
        }

        if ($request->has('permissions')) {
            $role->syncPermissions($request->validated('permissions'));
        }

        return RoleResource::make($role->load('permissions'));
    }

    public function destroy(Role $role): Response
    {
        abort_if(
            $role->name === config('filament-shield.super_admin.name'),
            Response::HTTP_FORBIDDEN,
            'The super administrator role cannot be deleted.',
        );

        $role->delete();

        return response()->noContent();
    }

    /**
     * List every assignable permission (for building role forms).
     */
    public function permissions(): AnonymousResourceCollection
    {
        return PermissionResource::collection(
            Permission::query()->orderBy('name')->get(),
        );
    }
}
