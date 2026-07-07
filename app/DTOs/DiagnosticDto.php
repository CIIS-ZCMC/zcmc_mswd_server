<?php

namespace App\DTOs;

class DiagnosticDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $created_by = null,
        public readonly ?string $diagnosis_name = null,
        public readonly ?string $diagnosis_description = null,
        public readonly ?string $diagnosis_date = null,
        public readonly ?string $attending_physician = null,
        public readonly ?string $facility_name = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            created_by: $data['created_by'] ?? null,
            diagnosis_name: $data['diagnosis_name'] ?? null,
            diagnosis_description: $data['diagnosis_description'] ?? null,
            diagnosis_date: $data['diagnosis_date'] ?? null,
            attending_physician: $data['attending_physician'] ?? null,
            facility_name: $data['facility_name'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'created_by' => $this->created_by,
            'diagnosis_name' => $this->diagnosis_name,
            'diagnosis_description' => $this->diagnosis_description,
            'diagnosis_date' => $this->diagnosis_date,
            'attending_physician' => $this->attending_physician,
            'facility_name' => $this->facility_name,
        ], fn ($value) => $value !== null);
    }
}
