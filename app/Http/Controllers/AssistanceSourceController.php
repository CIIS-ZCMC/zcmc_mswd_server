<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssistanceSourceRequest;
use App\Http\Requests\UpdateAssistanceSourceRequest;
use App\Http\Resources\AssistanceSourceResource;
use App\Models\AssistanceSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The breakdown types (assistance sources) a guarantee's lines use. Reads are open to
 * any signed-in user, for the dropdowns; anyone who may record a guarantee may also
 * manage the list. Unpaginated, like the other reference lookups.
 */
class AssistanceSourceController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:guarantee.create', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = AssistanceSource::query()
            // `?active=1` hides retired sources from new-record dropdowns while leaving
            // them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withCount('guaranteeItems')
            ->orderBy('name')
            ->get();

        return AssistanceSourceResource::collection($items);
    }

    public function show(AssistanceSource $assistanceSource): AssistanceSourceResource
    {
        return AssistanceSourceResource::make($assistanceSource->loadCount('guaranteeItems'));
    }

    public function store(StoreAssistanceSourceRequest $request): JsonResponse
    {
        $source = AssistanceSource::create($request->validated());

        return AssistanceSourceResource::make($source->refresh()->loadCount('guaranteeItems'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateAssistanceSourceRequest $request, AssistanceSource $assistanceSource): AssistanceSourceResource
    {
        $assistanceSource->update($request->validated());

        return AssistanceSourceResource::make($assistanceSource->refresh()->loadCount('guaranteeItems'));
    }

    /**
     * Soft delete: lines that already use the type keep showing its name, and new
     * lines can no longer pick it.
     */
    public function destroy(AssistanceSource $assistanceSource): Response
    {
        $assistanceSource->delete();

        return response()->noContent();
    }
}
