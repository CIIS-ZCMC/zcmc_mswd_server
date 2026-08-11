<?php

namespace App\Http\Controllers;

use App\DTOs\PatientDto;
use App\Http\Requests\MergePatientRequest;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Resources\ActivityResource;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientMergeService;
use App\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PatientController extends Controller
{
    public function __construct(protected PatientService $service) {}

    public function index(): AnonymousResourceCollection
    {
        return PatientResource::collection($this->service->list());
    }

    public function store(StorePatientRequest $request): JsonResponse
    {
        $patient = $this->service->create(PatientDto::fromArray($request->validated()));

        return PatientResource::make($patient)
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(Patient $patient): PatientResource
    {
        return PatientResource::make(
            $patient->loadCount(['cases', 'patientIds', 'familyMembers', 'watchers', 'documents']),
        );
    }

    public function update(UpdatePatientRequest $request, Patient $patient): PatientResource
    {
        return PatientResource::make(
            $this->service->update($patient, PatientDto::fromArray($request->validated())),
        );
    }

    public function destroy(Patient $patient): Response
    {
        $this->service->archive($patient);

        return response()->noContent();
    }

    public function restore(int $id): PatientResource
    {
        return PatientResource::make($this->service->restore($id));
    }

    /**
     * Consolidated 360 profile: demographics, records, relationships.
     */
    public function profile(Patient $patient): PatientResource
    {
        return PatientResource::make($this->service->profile($patient));
    }

    public function history(Patient $patient): AnonymousResourceCollection
    {
        return ActivityResource::collection($this->service->history($patient));
    }

    /**
     * Candidate duplicate patients (same name + birthdate).
     */
    public function duplicates(Patient $patient): AnonymousResourceCollection
    {
        return PatientResource::collection($this->service->duplicatesOf($patient));
    }

    /**
     * Merge this patient (source) into another (target), reassigning records.
     */
    public function merge(MergePatientRequest $request, Patient $patient, PatientMergeService $merge): PatientResource
    {
        $target = Patient::findOrFail($request->validated('target_id'));

        return PatientResource::make($merge->merge($patient, $target));
    }
}
