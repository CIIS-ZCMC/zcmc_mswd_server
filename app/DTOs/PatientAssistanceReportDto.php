<?php

namespace App\DTOs;

class PatientAssistanceReportDto
{
    public function __construct(
        public readonly ?int $assistance_id = null,
        public readonly ?string $hospital_id = null,
        public readonly ?string $mswd_id = null,
        public readonly ?string $patient_name = null,
        public readonly ?string $patient_address = null,
        public readonly ?string $assistant_type = null,
        public readonly ?string $category = null,
        public readonly ?float $amount = null,
        public readonly ?array $snapshot_json = null,
        public readonly ?int $released_by = null,
        public readonly ?string $released_at = null,
        public readonly ?bool $is_void = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            assistance_id: $data['assistance_id'] ?? null,
            hospital_id: $data['hospital_id'] ?? null,
            mswd_id: $data['mswd_id'] ?? null,
            patient_name: $data['patient_name'] ?? null,
            patient_address: $data['patient_address'] ?? null,
            assistant_type: $data['assistant_type'] ?? null,
            category: $data['category'] ?? null,
            amount: $data['amount'] ?? null,
            snapshot_json: $data['snapshot_json'] ?? null,
            released_by: $data['released_by'] ?? null,
            released_at: $data['released_at'] ?? null,
            is_void: $data['is_void'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'assistance_id' => $this->assistance_id,
            'hospital_id' => $this->hospital_id,
            'mswd_id' => $this->mswd_id,
            'patient_name' => $this->patient_name,
            'patient_address' => $this->patient_address,
            'assistant_type' => $this->assistant_type,
            'category' => $this->category,
            'amount' => $this->amount,
            'snapshot_json' => $this->snapshot_json,
            'released_by' => $this->released_by,
            'released_at' => $this->released_at,
            'is_void' => $this->is_void,
        ], fn ($value) => $value !== null);
    }
}
