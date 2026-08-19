<?php

namespace App\Http\Controllers;

use App\DTOs\InterventionDto;
use App\Http\Requests\StoreInterventionRequest;
use App\Http\Requests\UpdateInterventionRequest;
use App\Http\Resources\InterventionResource;
use App\Models\CaseModel;
use App\Models\Intervention;
use App\Services\CaseModelService;
use App\Services\InterventionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class InterventionController extends Controller implements HasMiddleware
{
    public function __construct(protected InterventionService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index']),
            new Middleware('permission:cases.create', only: ['store']),
            new Middleware('permission:cases.update', only: ['update', 'destroy']),
        ];
    }

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return InterventionResource::collection($case->interventions()->latest()->get());
    }

    public function store(StoreInterventionRequest $request, CaseModel $case, CaseModelService $cases): JsonResponse
    {
        $intervention = $this->service->create(InterventionDto::fromArray(array_merge($request->validated(), [
            'case_id' => $case->id,
            'created_by' => $request->user()->id,
            'date_given' => $request->validated('date_given') ?? now()->toDateString(),
        ])));

        $cases->logMilestone($case, $request->user(), 'intervention_given', "Intervention #{$intervention->id} given");

        return InterventionResource::make($intervention)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateInterventionRequest $request, Intervention $intervention): InterventionResource
    {
        return InterventionResource::make(
            $this->service->update($intervention, InterventionDto::fromArray($request->validated())),
        );
    }

    public function destroy(Intervention $intervention): Response
    {
        $this->service->delete($intervention);

        return response()->noContent();
    }
}
