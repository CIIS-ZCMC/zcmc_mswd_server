<?php

namespace App\Services;

use App\DTOs\DocumentDto;
use App\Models\CaseModel;
use App\Models\Document;
use App\Models\DocumentType;
use App\Models\Patient;
use App\Models\User;
use App\Repositories\Contracts\DocumentRepositoryInterface;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\UploadedFile;

class DocumentService
{
    public function __construct(protected DocumentRepositoryInterface $repository) {}

    public function list(int $page = 1, int $perPage = 15): LengthAwarePaginator
    {
        return $this->repository->paginate($page, $perPage);
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

    /**
     * Soft delete only: the file stays on its disk, so the record can be restored and
     * the audit trail still points at something.
     */
    public function delete(Document $document): bool
    {
        return $this->repository->delete($document);
    }

    /**
     * Store an uploaded file on the default disk and record it for the patient. The
     * mime type and size come from the stored file, not the client's claim.
     */
    public function upload(Patient $patient, ?CaseModel $case, UploadedFile $file, DocumentType $type, User $uploader): Document
    {
        $disk = config('filesystems.default');
        $folder = $case ? "cases/{$case->id}/documents" : "patients/{$patient->id}/documents";

        $path = $file->store($folder, ['disk' => $disk]);

        return $this->create(DocumentDto::fromArray([
            'patient_id' => $patient->id,
            'case_id' => $case?->id,
            'uploaded_by' => $uploader->id,
            'document_type_id' => $type->id,
            'document_type' => $type->name,
            'file_name' => $file->getClientOriginalName(),
            'file_path' => $path,
            'file_type' => $file->getMimeType() ?? $file->getClientMimeType(),
            'file_size' => $file->getSize(),
            'disk' => $disk,
        ]));
    }
}
