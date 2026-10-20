<?php

namespace App\Http\Controllers;

use App\DTOs\PatientWatcherDto;
use App\Http\Requests\StorePatientWatcherRequest;
use App\Http\Requests\UpdatePatientWatcherRequest;
use App\Http\Resources\PatientWatcherResource;
use App\Models\Patient;
use App\Models\PatientWatcher;
use App\Services\PatientWatcherService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class PatientWatcherController extends Controller
{
    public function __construct(protected PatientWatcherService $service) {}

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return PatientWatcherResource::collection(
            $patient->watchers()->with(['relationshipType', 'caseWatchers.case'])->latest()->get(),
        );
    }

    public function store(StorePatientWatcherRequest $request, Patient $patient): JsonResponse
    {
        $record = $this->service->create(PatientWatcherDto::fromArray(array_merge($request->validated(), [
            'added_by' => $request->user()->id,
        ])));

        return PatientWatcherResource::make($record->load('relationshipType'))->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdatePatientWatcherRequest $request, PatientWatcher $watcher): PatientWatcherResource
    {
        return PatientWatcherResource::make(
            $this->service->update($watcher, PatientWatcherDto::fromArray($request->validated()))
                ->load(['relationshipType', 'caseWatchers.case']),
        );
    }

    public function destroy(PatientWatcher $watcher): Response
    {
        $this->service->delete($watcher);

        return response()->noContent();
    }
}
