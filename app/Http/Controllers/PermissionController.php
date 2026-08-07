<?php

namespace App\Http\Controllers;

use App\DTOs\PermissionDto;
use App\Http\Requests\StorePermissionRequest;
use App\Http\Requests\UpdatePermissionRequest;
use App\Http\Resources\PermissionResource;
use App\Models\Permission;
use App\Services\PermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PermissionController extends Controller
{
    public function __construct(protected PermissionService $service) {}

    public function index(): AnonymousResourceCollection
    {
        return PermissionResource::collection($this->service->list());
    }

    public function store(StorePermissionRequest $request): JsonResponse
    {
        $permission = $this->service->create(PermissionDto::fromArray($request->validated()));

        return PermissionResource::make($permission)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Permission $permission): PermissionResource
    {
        return PermissionResource::make($permission);
    }

    public function update(UpdatePermissionRequest $request, Permission $permission): PermissionResource
    {
        $permission = $this->service->update($permission, PermissionDto::fromArray($request->validated()));

        return PermissionResource::make($permission);
    }

    public function destroy(Permission $permission): Response
    {
        $this->service->delete($permission);

        return response()->noContent();
    }
}
