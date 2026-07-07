<?php

namespace App\DTOs;

class PatientAssistanceLogDto
{
    public function __construct(
        public readonly ?int $assistance_id = null,
        public readonly ?string $status = null,
        public readonly ?string $action = null,
        public readonly ?int $action_by = null,
        public readonly ?string $action_date = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            assistance_id: $data['assistance_id'] ?? null,
            status: $data['status'] ?? null,
            action: $data['action'] ?? null,
            action_by: $data['action_by'] ?? null,
            action_date: $data['action_date'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'assistance_id' => $this->assistance_id,
            'status' => $this->status,
            'action' => $this->action,
            'action_by' => $this->action_by,
            'action_date' => $this->action_date,
        ], fn ($value) => $value !== null);
    }
}
