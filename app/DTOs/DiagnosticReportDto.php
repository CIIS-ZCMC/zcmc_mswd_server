<?php

namespace App\DTOs;

class DiagnosticReportDto
{
    public function __construct(
        public readonly ?int $uploaded_by = null,
        public readonly ?int $diagnostic_id = null,
        public readonly ?string $report_type = null,
        public readonly ?string $file_name = null,
        public readonly ?string $file_path = null,
        public readonly ?string $file_type = null,
        public readonly ?string $remarks = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            uploaded_by: $data['uploaded_by'] ?? null,
            diagnostic_id: $data['diagnostic_id'] ?? null,
            report_type: $data['report_type'] ?? null,
            file_name: $data['file_name'] ?? null,
            file_path: $data['file_path'] ?? null,
            file_type: $data['file_type'] ?? null,
            remarks: $data['remarks'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'uploaded_by' => $this->uploaded_by,
            'diagnostic_id' => $this->diagnostic_id,
            'report_type' => $this->report_type,
            'file_name' => $this->file_name,
            'file_path' => $this->file_path,
            'file_type' => $this->file_type,
            'remarks' => $this->remarks,
        ], fn ($value) => $value !== null);
    }
}
