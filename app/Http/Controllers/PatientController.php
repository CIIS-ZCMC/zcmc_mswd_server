<?php

namespace App\Http\Controllers;

use App\DTOs\PatientDto;
use App\Http\Requests\StorePatientRequest;
use App\Http\Requests\UpdatePatientRequest;
use App\Http\Resources\PatientResource;
use App\Models\Patient;
use App\Services\PatientService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PatientController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:patients.view', only: ['index', 'show']),
            new Middleware('permission:patients.create', only: ['store']),
            new Middleware('permission:patients.update', only: ['update']),
            new Middleware('permission:patients.delete', only: ['destroy']),
        ];
    }

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
}
