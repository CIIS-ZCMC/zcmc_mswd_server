<?php

namespace App\DTOs;

class PermissionDto
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $guard_name = null,
        public readonly ?string $description = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? null,
            guard_name: $data['guard_name'] ?? null,
            description: $data['description'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'guard_name' => $this->guard_name,
            'description' => $this->description,
        ], fn ($value) => $value !== null);
    }
}
