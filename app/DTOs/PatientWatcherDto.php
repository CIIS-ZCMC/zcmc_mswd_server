<?php

namespace App\DTOs;

class PatientWatcherDto
{
    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?string $name = null,
        public readonly ?string $relationship = null,
        public readonly ?string $contact_number = null,
        public readonly ?string $address = null,
        public readonly ?bool $is_primary = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            name: $data['name'] ?? null,
            relationship: $data['relationship'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            address: $data['address'] ?? null,
            is_primary: $data['is_primary'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'is_primary' => $this->is_primary,
        ], fn ($value) => $value !== null);
    }
}
