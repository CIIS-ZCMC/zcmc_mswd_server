<?php

namespace App\Support;

use App\Models\WatcherRelationshipType;
use Illuminate\Support\Str;

/**
 * Maps the legacy free-text watcher relationship ("Spouse", "barangay official")
 * onto a `watcher_relationship_types.code`. Text that matches no code or name
 * (case-insensitively) falls back to "other" instead of failing, so a data-quality
 * problem never blocks a migration.
 */
class WatcherRelationshipMapper
{
    public const FALLBACK = 'other';

    /** @var array<string, string>|null Normalised code or name => code. */
    private ?array $lookup = null;

    public function toCode(?string $legacy): string
    {
        if ($legacy === null || trim($legacy) === '') {
            return self::FALLBACK;
        }

        $normalized = Str::of($legacy)->lower()->trim()->toString();

        return $this->lookup()[$normalized] ?? self::FALLBACK;
    }

    /**
     * @return array<string, string>
     */
    private function lookup(): array
    {
        if ($this->lookup === null) {
            $this->lookup = [];

            foreach (WatcherRelationshipType::query()->get(['code', 'name']) as $type) {
                $this->lookup[Str::lower($type->name)] = $type->code;
                $this->lookup[Str::lower($type->code)] = $type->code;
            }
        }

        return $this->lookup;
    }
}
