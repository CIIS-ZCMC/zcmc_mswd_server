<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreCaseHospitalTransactionRequest;
use App\Http\Resources\CaseHospitalTransactionResource;
use App\Http\Resources\PatientTransactionResource;
use App\Models\CaseHospitalTransaction;
use App\Models\CaseModel;
use App\Services\CaseHospitalTransactionService;
use App\Services\PatientTransactionService;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Resources\Json\JsonResource;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class CaseHospitalTransactionController extends Controller implements HasMiddleware
{
    public function __construct(protected CaseHospitalTransactionService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:cases.view', only: ['index', 'show']),
            new Middleware('permission:cases.update', only: ['store', 'destroy']),
        ];
    }

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return CaseHospitalTransactionResource::collection(
            $case->hospitalTransactions()->latest('linked_at')->get(),
        );
    }

    public function store(StoreCaseHospitalTransactionRequest $request, CaseModel $case): JsonResponse
    {
        $link = $this->service->attach($case, $request->validated('his_transaction_id'), $request->user());

        return CaseHospitalTransactionResource::make($link)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    /**
     * The stored link plus a live re-read of the HIS encounter (guarantors,
     * details, diagnosis). The live read is best-effort: an unreachable or
     * removed encounter yields a null `live_transaction`, never a 500.
     */
    public function show(CaseHospitalTransaction $caseHospitalTransaction, PatientTransactionService $transactions): JsonResource
    {
        $live = null;

        try {
            $live = PatientTransactionResource::make($transactions->find($caseHospitalTransaction->his_transaction_id));
        } catch (ModelNotFoundException|QueryException $e) {
            report($e);
        }

        return CaseHospitalTransactionResource::make($caseHospitalTransaction)
            ->additional(['live_transaction' => $live]);
    }

    public function destroy(CaseHospitalTransaction $caseHospitalTransaction): Response
    {
        $this->service->detach($caseHospitalTransaction, request()->user());

        return response()->noContent();
    }
}
