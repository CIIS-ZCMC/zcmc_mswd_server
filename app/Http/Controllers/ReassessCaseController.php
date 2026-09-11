<?php

namespace App\Http\Controllers;

use App\DTOs\AssessmentDto;
use App\Http\Requests\StoreAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\CaseModel;
use App\Services\AssessmentService;
use App\Services\CaseModelService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;

class ReassessCaseController extends Controller
{
    public function __construct(protected AssessmentService $service) {}

    public function __invoke(StoreAssessmentRequest $request, CaseModel $case, CaseModelService $cases): JsonResponse
    {
        $validated = $request->validated();
        $reason = $validated['reassessment_reason'] ?? 'Re-assessment of patient socio-economic status';

        $assessment = $this->service->createReassessment(
            case: $case,
            dto: AssessmentDto::fromArray(array_merge($validated, [
                'created_by' => $request->user()->id,
            ])),
            reason: $reason,
        );

        $cases->logMilestone($case, $request->user(), 'reassessment_completed', "Re-assessment #{$assessment->id} recorded ({$reason})");

        return AssessmentResource::make($assessment)->response()->setStatusCode(Response::HTTP_CREATED);
    }
}

