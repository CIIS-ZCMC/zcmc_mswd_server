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

class PatientFamilyMemberController extends Controller
{
    public function __construct(protected PatientFamilyMemberService $service) {}

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
