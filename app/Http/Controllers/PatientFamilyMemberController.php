<?php

namespace App\Http\Controllers;

use App\DTOs\PatientFamilyMemberDto;
use App\Http\Requests\StorePatientFamilyMemberRequest;
use App\Http\Requests\UpdatePatientFamilyMemberRequest;
use App\Http\Resources\PatientFamilyMemberResource;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Services\PatientFamilyMemberService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;

class PatientFamilyMemberController extends Controller implements HasMiddleware
{
    public function __construct(protected PatientFamilyMemberService $service) {}

    public static function middleware(): array
    {
        return [
            new Middleware('permission:patients.view', only: ['index']),
            new Middleware('permission:patients.update', only: ['store', 'update', 'destroy']),
        ];
    }

    public function index(Patient $patient): AnonymousResourceCollection
    {
        return PatientFamilyMemberResource::collection($patient->familyMembers()->latest()->get());
    }

    public function store(StorePatientFamilyMemberRequest $request, Patient $patient): JsonResponse
    {
        $record = $this->service->create(PatientFamilyMemberDto::fromArray($request->validated()));

        return PatientFamilyMemberResource::make($record)->response()->setStatusCode(Response::HTTP_CREATED);
    }

    public function update(UpdatePatientFamilyMemberRequest $request, PatientFamilyMember $familyMember): PatientFamilyMemberResource
    {
        return PatientFamilyMemberResource::make($this->service->update($familyMember, PatientFamilyMemberDto::fromArray($request->validated())));
    }

    public function destroy(PatientFamilyMember $familyMember): Response
    {
        $this->service->delete($familyMember);

        return response()->noContent();
    }
}
