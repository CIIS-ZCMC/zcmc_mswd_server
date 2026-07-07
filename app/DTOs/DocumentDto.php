<?php

namespace App\DTOs;

class DocumentDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $patient_id = null,
        public readonly ?int $intervention_id = null,
        public readonly ?int $uploaded_by = null,
        public readonly ?string $document_type = null,
        public readonly ?string $file_name = null,
        public readonly ?string $file_path = null,
        public readonly ?string $file_type = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            patient_id: $data['patient_id'] ?? null,
            intervention_id: $data['intervention_id'] ?? null,
            uploaded_by: $data['uploaded_by'] ?? null,
            document_type: $data['document_type'] ?? null,
            file_name: $data['file_name'] ?? null,
            file_path: $data['file_path'] ?? null,
            file_type: $data['file_type'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'patient_id' => $this->patient_id,
            'intervention_id' => $this->intervention_id,
            'uploaded_by' => $this->uploaded_by,
            'document_type' => $this->document_type,
            'file_name' => $this->file_name,
            'file_path' => $this->file_path,
            'file_type' => $this->file_type,
        ], fn ($value) => $value !== null);
    }
}
