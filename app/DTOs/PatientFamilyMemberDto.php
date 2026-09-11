<?php

namespace App\DTOs;

class PatientFamilyMemberDto
{
    /**
     * The keys the caller actually supplied. An update must touch exactly these
     * columns: anything omitted is left alone, while an explicit `null` clears
     * the column instead of being silently dropped.
     *
     * @var array<int, string>
     */
    private array $provided = [];

    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?string $name = null,
        public readonly ?string $relationship = null,
        // A string, not a Carbon: the validator has already proved it is a
        // date, and both callers (JSON API, Filament DatePicker) supply strings.
        public readonly ?string $birthdate = null,
        public readonly ?string $sex = null,
        public readonly ?int $age = null,
        public readonly ?string $occupation = null,
        public readonly ?float $monthly_income = null,
        public readonly ?string $educational_attainment = null,
        public readonly ?string $contact_number = null,
        public readonly ?bool $is_living_with_patient = null,
    ) {}

    public static function fromArray(array $data): self
    {
        $dto = new self(
            patient_id: $data['patient_id'] ?? null,
            name: $data['name'] ?? null,
            relationship: $data['relationship'] ?? null,
            birthdate: $data['birthdate'] ?? null,
            sex: $data['sex'] ?? null,
            age: $data['age'] ?? null,
            occupation: $data['occupation'] ?? null,
            monthly_income: $data['monthly_income'] ?? null,
            educational_attainment: $data['educational_attainment'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            is_living_with_patient: $data['is_living_with_patient'] ?? null,
        );

        $dto->provided = array_keys(array_intersect_key($data, $dto->attributes()));

        return $dto;
    }

    public function toArray(): array
    {
        $attributes = $this->attributes();

        // A DTO built by hand carries no key list, so fall back to dropping
        // nulls — the behaviour every direct caller was written against.
        if ($this->provided === []) {
            return array_filter($attributes, fn ($value) => $value !== null);
        }

        return array_intersect_key($attributes, array_flip($this->provided));
    }

    /**
     * @return array<string, mixed>
     */
    private function attributes(): array
    {
        return [
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'birthdate' => $this->birthdate,
            'sex' => $this->sex,
            'age' => $this->age,
            'occupation' => $this->occupation,
            'monthly_income' => $this->monthly_income,
            'educational_attainment' => $this->educational_attainment,
            'contact_number' => $this->contact_number,
            'is_living_with_patient' => $this->is_living_with_patient,
        ];
    }
}
