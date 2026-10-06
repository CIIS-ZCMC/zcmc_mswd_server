<?php

namespace App\Http\Controllers;

use App\Http\Requests\StorePatientGuaranteeRequest;
use App\Http\Requests\UpdatePatientGuaranteeRequest;
use App\Http\Resources\PatientGuaranteeResource;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Services\PatientGuaranteeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

/**
 * The MSWD's patient guarantors per hospital encounter, each with a breakdown of
 * assistance sources. Separate from the read-only HIS ledger (PatientGuarantorController).
 */
class PatientGuaranteeController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientGuaranteeService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:guarantee.view', only: ['index', 'show']),
            new Middleware('permission:guarantee.create', only: ['store']),
            new Middleware('permission:guarantee.update', only: ['update']),
            new Middleware('permission:guarantee.delete', only: ['destroy']),
        ];
    }

    /**
     * The patient's guarantees, or one encounter's with `?transaction={id}`, with the
     * grand total across them.
     */
    public function index(Request $request, Patient $patient): JsonResponse
    {
        $request->validate(['transaction' => ['sometimes', 'integer', 'min:1']]);

        $guarantees = $this->service->forPatient($patient, $request->query('transaction'));

        return response()->json([
            'data' => PatientGuaranteeResource::collection($guarantees)->resolve($request),
            'grand_total' => round($guarantees->sum(fn (PatientGuarantee $guarantee) => $guarantee->total()), 2),
        ]);
    }

    public function show(PatientGuarantee $guarantee): PatientGuaranteeResource
    {
        return PatientGuaranteeResource::make($this->service->load($guarantee));
    }

    public function store(StorePatientGuaranteeRequest $request, Patient $patient): JsonResponse
    {
        $guarantee = $this->service->create($patient, $request->validated(), (int) $request->user()->id);

        return PatientGuaranteeResource::make($guarantee)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdatePatientGuaranteeRequest $request, PatientGuarantee $guarantee): PatientGuaranteeResource
    {
        return PatientGuaranteeResource::make($this->service->update($guarantee, $request->validated()));
    }

    public function destroy(PatientGuarantee $guarantee): Response
    {
        $this->service->delete($guarantee);

        return response()->noContent();
    }
}
