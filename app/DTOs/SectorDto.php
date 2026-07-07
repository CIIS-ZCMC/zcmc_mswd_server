<?php

namespace App\DTOs;

class SectorDto
{
    public function __construct(
        public readonly ?string $name = null,
        public readonly ?string $code = null,
    ) {
    }

    public static function fromArray(array $data): self
    {
        return new self(
            name: $data['name'] ?? null,
            code: $data['code'] ?? null,
        );
    }

    public function toArray(): array
    {
        return array_filter([
            'name' => $this->name,
            'code' => $this->code,
        ], fn ($value) => $value !== null);
    }
}
