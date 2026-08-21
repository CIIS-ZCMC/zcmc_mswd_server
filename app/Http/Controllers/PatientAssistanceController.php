<?php

namespace App\Http\Controllers;

use App\DTOs\PatientAssistanceDto;
use App\Http\Requests\StorePatientAssistanceRequest;
use App\Http\Requests\UpdatePatientAssistanceRequest;
use App\Http\Resources\PatientAssistanceResource;
use App\Models\CaseModel;
use App\Models\PatientAssistance;
use App\Services\CaseModelService;
use App\Services\PatientAssistanceService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PatientAssistanceController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientAssistanceService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:assistance.view', only: ['index', 'show']),
            new Middleware('permission:assistance.create', only: ['store']),
            new Middleware('permission:assistance.update', only: ['update', 'destroy']),
        ];
    }

    public function index(CaseModel $case): AnonymousResourceCollection
    {
        return PatientAssistanceResource::collection(
            $case->patientAssistances()->with(['assistantType', 'guarantor'])->latest()->get(),
        );
    }

    public function store(StorePatientAssistanceRequest $request, CaseModel $case, CaseModelService $cases): JsonResponse
    {
        $assistance = $this->service->create(PatientAssistanceDto::fromArray(array_merge($request->validated(), [
            'case_id' => $case->id,
            'created_by' => $request->user()->id,
        ])), $request->user());

        $cases->logMilestone($case, $request->user(), 'assistance_requested', "Assistance #{$assistance->id} requested");

        return PatientAssistanceResource::make($assistance->load(['assistantType', 'guarantor']))
            ->response()
            ->setStatusCode(Response::HTTP_CREATED);
    }

    public function show(PatientAssistance $assistance): PatientAssistanceResource
    {
        return PatientAssistanceResource::make(
            $assistance->load(['assistantType', 'guarantor', 'logs', 'reports']),
        );
    }

    public function update(UpdatePatientAssistanceRequest $request, PatientAssistance $assistance): PatientAssistanceResource
    {
        return PatientAssistanceResource::make(
            $this->service->update($assistance, PatientAssistanceDto::fromArray($request->validated()))
                ->load(['assistantType', 'guarantor']),
        );
    }

    public function destroy(PatientAssistance $assistance): Response
    {
        $this->service->delete($assistance);

        return response()->noContent();
    }
}
