<?php

namespace App\Enums;

enum RegistryStatus: string
{
    case Active = 'A';
    case Discharge = 'D';
    case Cancelled = 'X';
    case MayGoHome = 'M';
    case UntaggedMayGoHome = 'U';

    public function label(): string
    {
        return match ($this) {
            self::Active => 'Active',
            self::Discharge => 'Discharge',
            self::Cancelled => 'Cancelled',
            self::MayGoHome => 'May Go Home',
            self::UntaggedMayGoHome => 'Untagged as May Go Home',
        };
    }
}
