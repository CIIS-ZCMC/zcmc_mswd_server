<?php

namespace App\Services;

use App\Enums\WatcherRequirement;
use App\Models\CaseModel;
use App\Models\Patient;

/**
 * One source of truth for whether a case needs a registered watcher,
 * consumed by validation, transition guards, the API resource and the
 * client banner alike — see docs/WATCHER_LOGIC_PLAN.md §3.
 */
class WatcherRequirementService
{
    /** Age of majority under Philippine law (RA 6809). */
    private const MINOR_AGE_THRESHOLD = 18;

    public function resolve(CaseModel $case): WatcherRequirement
    {
        // A legacy case predating the cutover, or an explicit approved
        // waiver, overrides everything else.
        if ($case->watcher_legacy_exempt) {
            return WatcherRequirement::Waived;
        }

        if ($case->watcher_waiver_reason !== null && $case->watcher_waived_at !== null) {
            return WatcherRequirement::Waived;
        }

        // Legally incapable of speaking for themselves — any admission type.
        if ($this->isMinor($case->patient) || (bool) $case->patient->is_incapacitated) {
            return WatcherRequirement::Required;
        }

        return match ($case->admission_type) {
            'inpatient' => WatcherRequirement::Required,
            'ER' => WatcherRequirement::Recommended,
            'OPD' => WatcherRequirement::Optional,
            default => WatcherRequirement::Optional,
        };
    }

    /**
     * @return array{requirement: string, has_primary: bool, satisfied: bool, blocking: bool}
     */
    public function status(CaseModel $case): array
    {
        $requirement = $this->resolve($case);
        $hasPrimary = $case->watchers()->where('is_primary', true)->exists();

        return [
            'requirement' => $requirement->value,
            'has_primary' => $hasPrimary,
            'satisfied' => $hasPrimary || in_array($requirement, [
                WatcherRequirement::Optional,
                WatcherRequirement::Recommended,
                WatcherRequirement::Waived,
            ], true),
            'blocking' => $requirement === WatcherRequirement::Required && ! $hasPrimary,
        ];
    }

    /**
     * Falls back to estimated_age when birthdate is null — unidentified
     * patients often have only an estimate.
     */
    public function isMinor(Patient $patient): bool
    {
        if ($patient->birthdate !== null) {
            return $patient->birthdate->age < self::MINOR_AGE_THRESHOLD;
        }

        if ($patient->estimated_age !== null) {
            return $patient->estimated_age < self::MINOR_AGE_THRESHOLD;
        }

        return false;
    }
}
