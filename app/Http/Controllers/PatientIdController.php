<?php

namespace App\Http\Controllers;

use App\DTOs\PatientIdDto;
use App\Http\Requests\StorePatientIdRequest;
use App\Http\Requests\UpdatePatientIdRequest;
use App\Http\Resources\PatientIdResource;
use App\Models\Patient;
use App\Models\PatientId;
use App\Services\PatientIdService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PatientIdController extends Controller
{
    public function __construct(protected PatientIdService $service) {}

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return PatientIdResource::collection($patient->patientIds()->latest()->get());
    }

    public function store(StorePatientIdRequest $request, Patient $patient): JsonResponse
    {
        $record = $this->service->create(PatientIdDto::fromArray($request->validated()));

        return PatientIdResource::make($record)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdatePatientIdRequest $request, PatientId $patientId): PatientIdResource
    {
        return PatientIdResource::make($this->service->update($patientId, PatientIdDto::fromArray($request->validated())));
    }

    public function destroy(PatientId $patientId): Response
    {
        $this->service->delete($patientId);

        return response()->noContent();
    }
}
