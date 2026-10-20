<?php

namespace App\Services;

use App\Enums\WatcherRequirement;
use App\Models\CaseModel;
use App\Models\Patient;
use Illuminate\Support\Carbon;

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
     * @return array{requirement: string, requirement_reason: string, has_primary: bool, satisfied: bool, blocking: bool, waiver: array{reason: string, note: string|null, waived_by: string|null, waived_by_id: int|null, waived_at: Carbon|null}|null}
     */
    public function status(CaseModel $case): array
    {
        $requirement = $this->resolve($case);
        $hasPrimary = $this->hasActivePrimary($case);

        return [
            'requirement' => $requirement->value,
            'requirement_reason' => $this->reason($case, $requirement),
            'has_primary' => $hasPrimary,
            'satisfied' => $hasPrimary || in_array($requirement, [
                WatcherRequirement::Optional,
                WatcherRequirement::Recommended,
                WatcherRequirement::Waived,
            ], true),
            'blocking' => $requirement === WatcherRequirement::Required && ! $hasPrimary,
            'waiver' => $this->waiver($case),
        ];
    }

    /**
     * A primary watcher only counts while they can actually act for the
     * patient: their pass is not revoked and they have not left the ward.
     */
    private function hasActivePrimary(CaseModel $case): bool
    {
        return $case->watchers()
            ->where('is_primary', true)
            ->where('pass_status', '!=', 'revoked')
            ->where(fn ($query) => $query->whereNull('present_until')->orWhere('present_until', '>', now()))
            ->exists();
    }

    /**
     * Why the requirement is what it is, for the client banner: legacy,
     * waived, minor, incapacitated, or the admission type (inpatient, er, opd).
     */
    private function reason(CaseModel $case, WatcherRequirement $requirement): string
    {
        if ($case->watcher_legacy_exempt) {
            return 'legacy';
        }

        if ($requirement === WatcherRequirement::Waived) {
            return 'waived';
        }

        if ($this->isMinor($case->patient)) {
            return 'minor';
        }

        if ((bool) $case->patient->is_incapacitated) {
            return 'incapacitated';
        }

        return match ($case->admission_type) {
            'inpatient' => 'inpatient',
            'ER' => 'er',
            default => 'opd',
        };
    }

    /**
     * The filed-waiver detail for the client's "waived by X on Y — reason"
     * banner, or null when the case has no explicit waiver. A legacy-exempt case
     * resolves to `waived` but carries no waiver record, so it returns null too.
     *
     * @return array{reason: string, note: string|null, waived_by: string|null, waived_by_id: int|null, waived_at: Carbon|null}|null
     */
    private function waiver(CaseModel $case): ?array
    {
        if ($case->watcher_waiver_reason === null || $case->watcher_waived_at === null) {
            return null;
        }

        return [
            'reason' => $case->watcher_waiver_reason,
            'note' => $case->watcher_waiver_note,
            'waived_by' => $case->waivedBy?->getFilamentName(),
            'waived_by_id' => $case->watcher_waived_by,
            'waived_at' => $case->watcher_waived_at,
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
