<?php

namespace App\Http\Controllers;

use App\DTOs\AssessmentDto;
use App\Http\Requests\StoreAssessmentRequest;
use App\Http\Requests\UpdateAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Services\AssessmentService;
use App\Services\CaseModelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class AssessmentController extends Controller implements HasMiddleware
{
    public function __construct(protected AssessmentService $service) {}

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
        return AssessmentResource::collection($case->assessments()->latest()->get());
    }

    public function store(StoreAssessmentRequest $request, CaseModel $case, CaseModelService $cases): JsonResponse
    {
        $assessment = $this->service->create(AssessmentDto::fromArray(array_merge($request->validated(), [
            'case_id' => $case->id,
            'created_by' => $request->user()->id,
        ])));

        $cases->logMilestone($case, $request->user(), 'assessment_completed', "Assessment #{$assessment->id} recorded");

        return AssessmentResource::make($assessment)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdateAssessmentRequest $request, Assessment $assessment): AssessmentResource
    {
        return AssessmentResource::make(
            $this->service->update($assessment, AssessmentDto::fromArray($request->validated())),
        );
    }

    public function destroy(Assessment $assessment): Response
    {
        $this->service->delete($assessment);

        return response()->noContent();
    }
}
