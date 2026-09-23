<?php

namespace App\Http\Controllers;

use App\Http\Requests\AssessPatientTransactionRequest;
use App\Http\Resources\CaseHospitalTransactionResource;
use App\Http\Resources\CaseModelResource;
use App\Models\CaseModel;
use App\Services\CaseHospitalTransactionService;
use App\Services\PatientTransactionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * Assess a HIS encounter from the transaction side: list the cases it can be
 * attached to (the encounter patient's open cases), and attach it to one. Both
 * lean on the Phase A CaseHospitalTransactionService — no new persistence.
 */
class AssessPatientTransactionController extends Controller implements HasMiddleware
{
    public function __construct(
        protected CaseHospitalTransactionService $service,
        protected PatientTransactionService $transactions,
    ) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['cases']),
            new Middleware('permission:cases.update', only: ['assess']),
        ];
    }

    /**
     * The open cases this encounter can be assessed into (empty when the patient
     * is not local or has no open case).
     */
    public function cases(int|string $id): AnonymousResourceCollection
    {
        $transaction = $this->transactions->find($id);

        return CaseModelResource::collection($this->service->assignableCasesFor($transaction));
    }

    public function assess(AssessPatientTransactionRequest $request, int|string $id): JsonResponse
    {
        $case = CaseModel::findOrFail($request->validated('case_id'));

        $link = $this->service->attach($case, $id, $request->user());

        return CaseHospitalTransactionResource::make($link)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }
}
