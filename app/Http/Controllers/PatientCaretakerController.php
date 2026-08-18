<?php

namespace App\Http\Controllers;

use App\DTOs\PatientCaretakerDto;
use App\Http\Requests\StorePatientCaretakerRequest;
use App\Http\Resources\PatientCaretakerResource;
use App\Models\Patient;
use App\Services\PatientCaretakerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PatientCaretakerController extends Controller
{
    public function __construct(protected PatientCaretakerService $service) {}

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return PatientCaretakerResource::collection(
            $patient->caretakers()->latest('assigned_date')->get(),
        );
    }

    /**
     * Assign a social worker (or other role) to the patient.
     */
    public function store(StorePatientCaretakerRequest $request, Patient $patient): JsonResponse
    {
        $record = $this->service->create(PatientCaretakerDto::fromArray($request->validated()));

        return PatientCaretakerResource::make($record)->response()->setStatusCode(Response::HTTP_CREATED);
    }
}
