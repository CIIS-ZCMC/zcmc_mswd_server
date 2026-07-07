<?php

namespace App\DTOs;

class PatientFamilyMemberDto
{
    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?string $name = null,
        public readonly ?string $relationship = null,
        public readonly ?int $age = null,
        public readonly ?string $occupation = null,
        public readonly ?float $monthly_income = null,
        public readonly ?string $education = null,
        public readonly ?string $contact_number = null,
        public readonly ?bool $is_living_with_patient = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            name: $data['name'] ?? null,
            relationship: $data['relationship'] ?? null,
            age: $data['age'] ?? null,
            occupation: $data['occupation'] ?? null,
            monthly_income: $data['monthly_income'] ?? null,
            education: $data['education'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            is_living_with_patient: $data['is_living_with_patient'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'age' => $this->age,
            'occupation' => $this->occupation,
            'monthly_income' => $this->monthly_income,
            'education' => $this->education,
            'contact_number' => $this->contact_number,
            'is_living_with_patient' => $this->is_living_with_patient,
        ], fn ($value) => $value !== null);
    }
}
