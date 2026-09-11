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
        public readonly ?int $assigned_by = null,
        public readonly ?int $unassigned_by = null,
        public readonly ?string $reason = null,
        public readonly ?string $unassigned_reason = null,
        public readonly ?int $replaced_by_id = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            patient_id: $data['patient_id'] ?? null,
            user_id: $data['user_id'] ?? null,
            role: $data['role'] ?? null,
            assigned_date: $data['assigned_date'] ?? null,
            unassigned_date: $data['unassigned_date'] ?? null,
            is_active: $data['is_active'] ?? null,
            assigned_by: $data['assigned_by'] ?? null,
            unassigned_by: $data['unassigned_by'] ?? null,
            reason: $data['reason'] ?? null,
            unassigned_reason: $data['unassigned_reason'] ?? null,
            replaced_by_id: $data['replaced_by_id'] ?? null,
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
            'assigned_by' => $this->assigned_by,
            'unassigned_by' => $this->unassigned_by,
            'reason' => $this->reason,
            'unassigned_reason' => $this->unassigned_reason,
            'replaced_by_id' => $this->replaced_by_id,
        ], fn ($value) => $value !== null);
    }
}
