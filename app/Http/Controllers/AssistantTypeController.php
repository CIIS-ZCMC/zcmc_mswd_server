<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreAssistantTypeRequest;
use App\Http\Requests\UpdateAssistantTypeRequest;
use App\Http\Resources\AssistantTypeResource;
use App\Models\AssistantType;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Types of Assistance (Medicines, Hospital Bill, …). Reads are open to any signed-in
 * user, for the dropdowns; `library.manage` edits the list. Small reference table, so
 * the whole list is returned unpaginated.
 */
class AssistantTypeController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = AssistantType::query()
            // `?active=1` hides retired entries from new-record dropdowns
            // while leaving them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withCount('patientAssistances')
            ->ordered()
            ->get();

        return AssistantTypeResource::collection($items);
    }

    public function show(AssistantType $assistantType): AssistantTypeResource
    {
        return AssistantTypeResource::make($assistantType->loadCount('patientAssistances'));
    }

    public function store(StoreAssistantTypeRequest $request): JsonResponse
    {
        $type = AssistantType::create($request->validated());

        return AssistantTypeResource::make($type->refresh()->loadCount('patientAssistances'))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateAssistantTypeRequest $request, AssistantType $assistantType): AssistantTypeResource
    {
        $assistantType->update($request->validated());

        return AssistantTypeResource::make($assistantType->refresh()->loadCount('patientAssistances'));
    }

    /**
     * Soft delete: records that already use the type keep showing it, and new records
     * can no longer pick it.
     */
    public function destroy(AssistantType $assistantType): Response
    {
        $assistantType->delete();

        return response()->noContent();
    }
}
