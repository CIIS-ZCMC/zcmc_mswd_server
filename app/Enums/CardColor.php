<?php

namespace App\Enums;

/**
 * Manual triage colour for a case card. Meaning is defined by staff convention,
 * not derived from priority or status. Stored as a string on `cases.card_color`
 * (see docs/MIGRATIONS.md — enums live as string columns, cast here).
 */
enum CardColor: string
{
    case White = 'white';
    case Green = 'green';
    case Orange = 'orange';
    case Pink = 'pink';

    public function label(): string
    {
        return match ($this) {
            self::White => 'White',
            self::Green => 'Green',
            self::Orange => 'Orange',
            self::Pink => 'Pink',
        };
    }

    /**
     * The backing values, for validation rules and Filament select options.
     *
     * @return list<string>
     */
    public static function values(): array
    {
        return array_map(fn (self $c) => $c->value, self::cases());
    }
}
