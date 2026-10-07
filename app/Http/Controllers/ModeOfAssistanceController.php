<?php

namespace App\Http\Controllers;

use App\Http\Requests\ModeOfAssistanceRequest;
use App\Http\Resources\AssessmentLookupResource;
use App\Models\ModeOfAssistance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The UIS §V modes of assistance. Reads are open to any signed-in user, for the
 * dropdowns; `library.manage` edits the list. Unpaginated, like the other lookups.
 */
class ModeOfAssistanceController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = ModeOfAssistance::query()
            // `?active=1` hides retired modes from new-record dropdowns while leaving
            // them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withUsageCount()
            ->ordered()
            ->get();

        return AssessmentLookupResource::collection($items);
    }

    public function show(ModeOfAssistance $modeOfAssistance): AssessmentLookupResource
    {
        return $this->present($modeOfAssistance);
    }

    public function store(ModeOfAssistanceRequest $request): JsonResponse
    {
        $mode = ModeOfAssistance::create($request->validated());

        return $this->present($mode)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(ModeOfAssistanceRequest $request, ModeOfAssistance $modeOfAssistance): AssessmentLookupResource
    {
        $modeOfAssistance->update($request->validated());

        return $this->present($modeOfAssistance);
    }

    /**
     * Soft delete: assessments that store the code keep printing its name, and new
     * assessments can no longer pick it.
     */
    public function destroy(ModeOfAssistance $modeOfAssistance): Response
    {
        $modeOfAssistance->delete();

        return response()->noContent();
    }

    private function present(ModeOfAssistance $mode): AssessmentLookupResource
    {
        return AssessmentLookupResource::make(ModeOfAssistance::withUsageCount()->findOrFail($mode->getKey()));
    }
}
