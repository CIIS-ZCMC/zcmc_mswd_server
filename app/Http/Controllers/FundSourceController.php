<?php

namespace App\Http\Controllers;

use App\Http\Requests\FundSourceRequest;
use App\Http\Resources\AssessmentLookupResource;
use App\Models\FundSource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The UIS §V fund sources. Reads are open to any signed-in user, for the dropdowns;
 * `library.manage` edits the list. Unpaginated, like the other lookups.
 */
class FundSourceController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [
            new Middleware('permission:library.manage', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Request $request): AnonymousResourceCollection
    {
        $items = FundSource::query()
            // `?active=1` hides retired sources from new-record dropdowns while leaving
            // them resolvable on historical records.
            ->when($request->boolean('active'), fn ($query) => $query->where('is_active', true))
            ->withUsageCount()
            ->ordered()
            ->get();

        return AssessmentLookupResource::collection($items);
    }

    public function show(FundSource $fundSource): AssessmentLookupResource
    {
        return $this->present($fundSource);
    }

    public function store(FundSourceRequest $request): JsonResponse
    {
        $source = FundSource::create($request->validated());

        return $this->present($source)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(FundSourceRequest $request, FundSource $fundSource): AssessmentLookupResource
    {
        $fundSource->update($request->validated());

        return $this->present($fundSource);
    }

    /**
     * Soft delete: assessments that store the code keep printing its name, and new
     * assessments can no longer pick it.
     */
    public function destroy(FundSource $fundSource): Response
    {
        $fundSource->delete();

        return response()->noContent();
    }

    private function present(FundSource $source): AssessmentLookupResource
    {
        return AssessmentLookupResource::make(FundSource::withUsageCount()->findOrFail($source->getKey()));
    }
}
