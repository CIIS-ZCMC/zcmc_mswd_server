<?php

namespace App\DTOs;

class AssistantTypeDto
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $code = null,
        public readonly ?string $category = null,
        public readonly ?string $description = null,
        public readonly ?bool $is_active = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? null,
            code: $data['code'] ?? null,
            category: $data['category'] ?? null,
            description: $data['description'] ?? null,
            is_active: $data['is_active'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'code' => $this->code,
            'category' => $this->category,
            'description' => $this->description,
            'is_active' => $this->is_active,
        ], fn ($value) => $value !== null);
    }
}
