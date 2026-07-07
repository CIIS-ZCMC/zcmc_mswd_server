<?php

namespace App\DTOs;

class CaseActivityDto
{
    public function __construct(
        public readonly ?int $case_id = null,
        public readonly ?int $assigned_user_id = null,
        public readonly ?int $previous_user_id = null,
        public readonly ?string $activity_type = null,
        public readonly ?string $activity_date = null,
        public readonly ?string $notes = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            case_id: $data['case_id'] ?? null,
            assigned_user_id: $data['assigned_user_id'] ?? null,
            previous_user_id: $data['previous_user_id'] ?? null,
            activity_type: $data['activity_type'] ?? null,
            activity_date: $data['activity_date'] ?? null,
            notes: $data['notes'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'case_id' => $this->case_id,
            'assigned_user_id' => $this->assigned_user_id,
            'previous_user_id' => $this->previous_user_id,
            'activity_type' => $this->activity_type,
            'activity_date' => $this->activity_date,
            'notes' => $this->notes,
        ], fn ($value) => $value !== null);
    }
}
