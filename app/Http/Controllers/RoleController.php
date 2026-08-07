<?php

namespace App\Http\Controllers;

use App\DTOs\RoleDto;
use App\Http\Requests\StoreRoleRequest;
use App\Http\Requests\UpdateRoleRequest;
use App\Http\Resources\RoleResource;
use App\Models\Role;
use App\Services\RoleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class RoleController extends Controller
{
    public function __construct(protected RoleService $service) {}

    public function index(): AnonymousResourceCollection
    {
        return RoleResource::collection($this->service->list());
    }

    public function store(StoreRoleRequest $request): JsonResponse
    {
        $role = $this->service->create(RoleDto::fromArray($request->validated()));

        return RoleResource::make($role)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Role $role): RoleResource
    {
        return RoleResource::make($role->load('permissions'));
    }

    public function update(UpdateRoleRequest $request, Role $role): RoleResource
    {
        $role = $this->service->update($role, RoleDto::fromArray($request->validated()));

        return RoleResource::make($role);
    }

    public function destroy(Role $role): Response
    {
        $this->service->delete($role);

        return response()->noContent();
    }
}
