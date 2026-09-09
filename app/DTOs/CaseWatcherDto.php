<?php

namespace App\DTOs;

class CaseWatcherDto
{
    /**
     * Keys present in the source array, whatever their value — lets toArray()
     * distinguish "omitted" (leave column untouched) from "explicit null"
     * (clear the column) instead of collapsing both to "not written".
     *
     * @var array<int, string>
     */
    private readonly array $suppliedKeys;

    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $patient_watcher_id = null,
        public readonly ?string $name = null,
        public readonly ?string $relationship = null,
        public readonly ?string $contact_number = null,
        public readonly ?string $address = null,
        public readonly ?bool $is_primary = null,
        public readonly ?bool $is_informant = null,
        public readonly ?string $present_from = null,
        public readonly ?string $present_until = null,
        public readonly ?int $added_by = null,
        public readonly ?string $notes = null,
        array $suppliedKeys = [],
    ) {
        $this->suppliedKeys = $suppliedKeys;
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            patient_watcher_id: $data['patient_watcher_id'] ?? null,
            name: $data['name'] ?? null,
            relationship: $data['relationship'] ?? null,
            contact_number: $data['contact_number'] ?? null,
            address: $data['address'] ?? null,
            is_primary: $data['is_primary'] ?? null,
            is_informant: $data['is_informant'] ?? null,
            present_from: $data['present_from'] ?? null,
            present_until: $data['present_until'] ?? null,
            added_by: $data['added_by'] ?? null,
            notes: $data['notes'] ?? null,
            suppliedKeys: array_keys($data),
        );
    }

    public function toArray(): array
    {
        $all = [
            'case_id' => $this->case_id,
            'patient_watcher_id' => $this->patient_watcher_id,
            'name' => $this->name,
            'relationship' => $this->relationship,
            'contact_number' => $this->contact_number,
            'address' => $this->address,
            'is_primary' => $this->is_primary,
            'is_informant' => $this->is_informant,
            'present_from' => $this->present_from,
            'present_until' => $this->present_until,
            'added_by' => $this->added_by,
            'notes' => $this->notes,
        ];

        $attributes = array_intersect_key($all, array_flip($this->suppliedKeys));

        // case_id/added_by stay present-only regardless of what was supplied,
        // so an update can never null out — and thus reassign or orphan — a
        // watcher's case or its audit trail of who added it.
        return array_filter(
            $attributes,
            fn ($value, $key) => ! in_array($key, ['case_id', 'added_by'], true) || $value !== null,
            ARRAY_FILTER_USE_BOTH,
        );
    }
}
