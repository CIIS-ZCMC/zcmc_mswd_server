<?php

namespace App\Enums;

enum HospitalPatientImportOutcome: string
{
    case Created = 'created';
    case Updated = 'updated';
    case Skipped = 'skipped';
    case Failed = 'failed';

    public function label(): string
    {
        return match ($this) {
            self::Created => 'Created',
            self::Updated => 'Updated',
            self::Skipped => 'Skipped',
            self::Failed => 'Failed',
        };
    }
}
