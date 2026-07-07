<?php

namespace App\Services;

use App\DTOs\DocumentDto;
use App\Models\Document;
use App\Repositories\Contracts\DocumentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;

class DocumentService
{
    public function __construct(protected DocumentRepositoryInterface $repository)
    {
    }

    public function list(int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($perPage);
    }

    public function find(int|string $id): Document
    {
        return $this->repository->findOrFail($id);
    }

    public function create(DocumentDto $dto): Document
    {
        return $this->repository->create($dto->toArray());
    }

    public function update(Document $document, DocumentDto $dto): Document
    {
        return $this->repository->update($document, $dto->toArray());
    }

    public function delete(Document $document): bool
    {
        return $this->repository->delete($document);
    }
}
