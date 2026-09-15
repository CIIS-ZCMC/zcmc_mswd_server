<?php

namespace App\Http\Controllers;

use App\Http\Requests\PatientTransactionSearchRequest;
use App\Http\Resources\PatientTransactionResource;
use App\Services\PatientTransactionService;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class FindPatientTransactionController extends Controller
{
    public function __construct(protected PatientTransactionService $service) {}

    /**
     * Find transactions by name and/or hospital number and/or registration date (404 when none match).
     */
    public function __invoke(PatientTransactionSearchRequest $request): AnonymousResourceCollection
    {
        $validated = $request->validated();

        return PatientTransactionResource::collection(
            $this->service->findByNameAndHospitalNumber(
                $validated['name'] ?? null,
                $validated['hospital_number'] ?? null,
                $validated['date'] ?? null,
            ),
        );
    }
}
