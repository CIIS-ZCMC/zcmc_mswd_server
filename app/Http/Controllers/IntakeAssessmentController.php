<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreIntakeAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\Patient;
use App\Services\IntakeAssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Take an Intake Assessment (UIS) for one of a patient's HIS encounters, with no
 * case needed. Written under the same permission as a case's assessment.
 */
class IntakeAssessmentController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:cases.create')];
    }

    public function store(StoreIntakeAssessmentRequest $request, Patient $patient, IntakeAssessmentService $intakes): JsonResponse
    {
        $validated = $request->validated();
        $transactionId = (int) $validated['his_transaction_id'];
        unset($validated['his_transaction_id']);

        $assessment = $intakes->create($patient, $transactionId, $validated, $request->user());

        return AssessmentResource::make($assessment)->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
