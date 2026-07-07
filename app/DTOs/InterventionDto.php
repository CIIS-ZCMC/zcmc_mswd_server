<?php

namespace App\DTOs;

class InterventionDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $created_by = null,
        public readonly ?int $intervention_type_id = null,
        public readonly ?string $description = null,
        public readonly ?string $date_given = null,
        public readonly ?string $outcome = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            created_by: $data['created_by'] ?? null,
            intervention_type_id: $data['intervention_type_id'] ?? null,
            description: $data['description'] ?? null,
            date_given: $data['date_given'] ?? null,
            outcome: $data['outcome'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'created_by' => $this->created_by,
            'intervention_type_id' => $this->intervention_type_id,
            'description' => $this->description,
            'date_given' => $this->date_given,
            'outcome' => $this->outcome,
        ], fn ($value) => $value !== null);
    }
}
