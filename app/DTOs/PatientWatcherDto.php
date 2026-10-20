<?php

namespace App\DTOs;

class PatientWatcherDto
{
    /**
     * Keys present in the source array, whatever their value — lets toArray()
     * tell "omitted" (leave the column alone) from "explicit null" (clear it).
     *
     * @var array<int, string>
     */
    private readonly array $suppliedKeys;

    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?string $name = null,
        public readonly ?string $first_name = null,
        public readonly ?string $middle_name = null,
        public readonly ?string $last_name = null,
        public readonly ?string $relationship_code = null,
        public readonly ?string $contact_number = null,
        public readonly ?string $address = null,
        public readonly ?string $notes = null,
        public readonly ?int $added_by = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            name: $data['name'] ?? null,
            first_name: $data['first_name'] ?? null,
            middle_name: $data['middle_name'] ?? null,
            last_name: $data['last_name'] ?? null,
            relationship_code: $data['relationship_code'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            address: $data['address'] ?? null,
            notes: $data['notes'] ?? null,
            added_by: $data['added_by'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'patient_id' => $this->patient_id,
            'name' => $this->name,
            'first_name' => $this->first_name,
            'middle_name' => $this->middle_name,
            'last_name' => $this->last_name,
            'relationship_code' => $this->relationship_code,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'notes' => $this->notes,
            'added_by' => $this->added_by,
        ];

        $attributes = array_intersect_key($all, array_flip($this->suppliedKeys));

        // The owning patient, the author and the required fields can never be
        // nulled by an update.
        return array_filter(
            $attributes,
            fn ($value, $key) => ! in_array($key, ['patient_id', 'added_by', 'name', 'first_name', 'last_name', 'relationship_code'], true) || $value !== null,
            ARRAY_FILTER_USE_BOTH,
        );
    }
}
