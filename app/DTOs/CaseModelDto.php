<?php

namespace App\DTOs;

class CaseModelDto
{
    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?int $assigned_user_id = null,
        public readonly ?string $case_code = null,
        public readonly ?string $case_type = null,
        public readonly ?string $priority_level = null,
        public readonly ?string $status = null,
        public readonly ?string $admission_type = null,
        public readonly ?string $date_opened = null,
        public readonly ?string $date_closed = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            assigned_user_id: $data['assigned_user_id'] ?? null,
            case_code: $data['case_code'] ?? null,
            case_type: $data['case_type'] ?? null,
            priority_level: $data['priority_level'] ?? null,
            status: $data['status'] ?? null,
            admission_type: $data['admission_type'] ?? null,
            date_opened: $data['date_opened'] ?? null,
            date_closed: $data['date_closed'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'patient_id' => $this->patient_id,
            'assigned_user_id' => $this->assigned_user_id,
            'case_code' => $this->case_code,
            'case_type' => $this->case_type,
            'priority_level' => $this->priority_level,
            'status' => $this->status,
            'admission_type' => $this->admission_type,
            'date_opened' => $this->date_opened,
            'date_closed' => $this->date_closed,
        ], fn ($value) => $value !== null);
    }
}
