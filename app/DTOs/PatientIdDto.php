<?php

namespace App\DTOs;

class PatientIdDto
{
    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?string $id_type = null,
        public readonly ?string $id_number = null,
        public readonly ?string $date_issued = null,
        public readonly ?string $date_expiry = null,
        public readonly ?bool $is_verified = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            id_type: $data['id_type'] ?? null,
            id_number: $data['id_number'] ?? null,
            date_issued: $data['date_issued'] ?? null,
            date_expiry: $data['date_expiry'] ?? null,
            is_verified: $data['is_verified'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'patient_id' => $this->patient_id,
            'id_type' => $this->id_type,
            'id_number' => $this->id_number,
            'date_issued' => $this->date_issued,
            'date_expiry' => $this->date_expiry,
            'is_verified' => $this->is_verified,
        ], fn ($value) => $value !== null);
    }
}
