<?php

namespace App\DTOs;

class PatientCaretakerDto
{
    public function __construct(
        public readonly ?int $patient_id = null,
        public readonly ?int $user_id = null,
        public readonly ?string $role = null,
        public readonly ?string $assigned_date = null,
        public readonly ?string $unassigned_date = null,
        public readonly ?bool $is_active = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            user_id: $data['user_id'] ?? null,
            role: $data['role'] ?? null,
            assigned_date: $data['assigned_date'] ?? null,
            unassigned_date: $data['unassigned_date'] ?? null,
            is_active: $data['is_active'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'patient_id' => $this->patient_id,
            'user_id' => $this->user_id,
            'role' => $this->role,
            'assigned_date' => $this->assigned_date,
            'unassigned_date' => $this->unassigned_date,
            'is_active' => $this->is_active,
        ], fn ($value) => $value !== null);
    }
}
