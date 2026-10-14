<?php

namespace App\Http\Controllers;

use App\Http\Requests\UpdateTurnaroundTargetRequest;
use App\Http\Resources\TurnaroundTargetResource;
use App\Models\TurnaroundTarget;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Citizen's Charter turnaround time benchmarks per stage.
 * Reads are open to any authenticated user; writes require `library.manage`.
 */
class TurnaroundTargetController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['update']),
        ];
    }

    public function index(): AnonymousResourceCollection
    {
        return TurnaroundTargetResource::collection(
            TurnaroundTarget::query()->orderBy('id')->get()
        );
    }

    public function show(TurnaroundTarget $turnaroundTarget): TurnaroundTargetResource
    {
        return TurnaroundTargetResource::make($turnaroundTarget);
    }

    public function update(UpdateTurnaroundTargetRequest $request, TurnaroundTarget $turnaroundTarget): TurnaroundTargetResource
    {
        $turnaroundTarget->update($request->validated());

        return TurnaroundTargetResource::make($turnaroundTarget);
    }
}
