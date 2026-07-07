<?php

namespace App\DTOs;

class UserDto
{
    public function __construct(
        public readonly ?int $id = null,
        public readonly ?string $displayName = null,
        public readonly ?string $role = null,
        public readonly ?bool $is_active = null,
        public readonly ?string $synced_at = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'] ?? null,
            displayName: $data['displayName'] ?? null,
            role: $data['role'] ?? null,
            is_active: $data['is_active'] ?? null,
            synced_at: $data['synced_at'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'id' => $this->id,
            'displayName' => $this->displayName,
            'role' => $this->role,
            'is_active' => $this->is_active,
            'synced_at' => $this->synced_at,
        ], fn ($value) => $value !== null);
    }
}
