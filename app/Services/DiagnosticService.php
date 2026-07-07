<?php

namespace App\Services;

use App\DTOs\DiagnosticDto;
use App\Models\Diagnostic;
use App\Repositories\Contracts\DiagnosticRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DiagnosticService
{
    public function __construct(protected DiagnosticRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Diagnostic
    {
        return $this->repository->findOrFail($id);
    }

    public function create(DiagnosticDto $dto): Diagnostic
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Diagnostic $diagnostic, DiagnosticDto $dto): Diagnostic
    {
        return $this->repository->update($diagnostic, $dto->toArray());
    }

    public function delete(Diagnostic $diagnostic): bool
    {
        return $this->repository->delete($diagnostic);
    }
}
