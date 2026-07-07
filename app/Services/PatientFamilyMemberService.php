<?php

namespace App\Services;

use App\DTOs\PatientFamilyMemberDto;
use App\Models\PatientFamilyMember;
use App\Repositories\Contracts\PatientFamilyMemberRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class PatientFamilyMemberService
{
    public function __construct(protected PatientFamilyMemberRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): PatientFamilyMember
    {
        return $this->repository->findOrFail($id);
    }

    public function create(PatientFamilyMemberDto $dto): PatientFamilyMember
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(PatientFamilyMember $patientFamilyMember, PatientFamilyMemberDto $dto): PatientFamilyMember
    {
        return $this->repository->update($patientFamilyMember, $dto->toArray());
    }

    public function delete(PatientFamilyMember $patientFamilyMember): bool
    {
        return $this->repository->delete($patientFamilyMember);
    }
}
