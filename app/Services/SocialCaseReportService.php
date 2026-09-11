<?php

namespace App\Services;

use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\CaseProgressNote;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Carbon;

/**
 * Social case study aggregates over a date range — docs/SOCIAL_CASE_PLAN.md
 * Phase D.
 *
 * Every figure is one grouped query, never a count per bucket in a loop.
 * Protective cases are excluded for a viewer without `audit.view_protective`,
 * mirroring ActivityLogService, and the response says so rather than quietly
 * reporting a smaller number.
 */
class SocialCaseReportService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?User $viewer, ?string $from, ?string $to): array
    {
        [$from, $to] = $this->range($from, $to);
        $protectiveExcluded = ! ($viewer?->can('audit.view_protective') ?? false);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            // Never let a filtered total read as a complete one.
            'protective_excluded' => $protectiveExcluded,
            'total' => (int) $this->scsrQuery($protectiveExcluded, $from, $to)->count(),
            'by_social_case_status' => $this->countBy($protectiveExcluded, $from, $to, 'assessments.social_case_status'),
            'by_classification' => $this->countBy($protectiveExcluded, $from, $to, 'assessments.classification'),
            'by_case_type' => $this->countBy($protectiveExcluded, $from, $to, 'cases.case_type'),
            'by_admission_type' => $this->countBy($protectiveExcluded, $from, $to, 'cases.admission_type'),
            'by_assigned_user' => $this->countByAssignedUser($protectiveExcluded, $from, $to),
            'median_days_to_finalize' => $this->medianDaysToFinalize($protectiveExcluded, $from, $to),
            'cases_without_social_case' => $this->casesWithoutSocialCase($protectiveExcluded, $from, $to),
            'overdue_follow_ups' => $this->overdueFollowUps($protectiveExcluded),
        ];
    }

    /**
     * The same dataset flattened for CSV: one row per aggregate bucket, so a
     * spreadsheet can pivot it without knowing the response shape.
     *
     * @return array{headers: list<string>, rows: list<list<string|int>>}
     */
    public function toRows(array $summary): array
    {
        $rows = [];

        foreach ([
            'social_case_status' => 'by_social_case_status',
            'classification' => 'by_classification',
            'case_type' => 'by_case_type',
            'admission_type' => 'by_admission_type',
            'assigned_user' => 'by_assigned_user',
        ] as $group => $key) {
            foreach ($summary[$key] as $label => $count) {
                $rows[] = [$group, (string) $label, (int) $count];
            }
        }

        $rows[] = ['total', 'social_case_studies', $summary['total']];
        $rows[] = ['median_days_to_finalize', 'days', $summary['median_days_to_finalize'] ?? ''];
        $rows[] = ['cases_without_social_case', 'cases', $summary['cases_without_social_case']];
        $rows[] = ['overdue_follow_ups', 'notes', $summary['overdue_follow_ups']];

        return ['headers' => ['group', 'label', 'value'], 'rows' => $rows];
    }

    /**
     * Social case studies started within the range, joined to their case so
     * case-level columns can be grouped on and the protective filter applied.
     *
     * @return Builder<Assessment>
     */
    private function scsrQuery(bool $protectiveExcluded, Carbon $from, Carbon $to): Builder
    {
        return Assessment::query()
            ->join('cases', 'cases.id', '=', 'assessments.case_id')
            ->whereNotNull('assessments.social_case_status')
            ->whereNull('cases.deleted_at')
            ->whereBetween('assessments.created_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->when($protectiveExcluded, fn (Builder $q) => $q->where('cases.is_protective', false));
    }

    /**
     * @return array<string, int>
     */
    private function countBy(bool $protectiveExcluded, Carbon $from, Carbon $to, string $column): array
    {
        return $this->scsrQuery($protectiveExcluded, $from, $to)
            ->selectRaw("{$column} as bucket, COUNT(*) as aggregate")
            ->groupBy('bucket')
            ->pluck('aggregate', 'bucket')
            ->mapWithKeys(fn ($count, $bucket) => [(string) ($bucket === '' ? 'unspecified' : $bucket) => (int) $count])
            ->all();
    }

    /**
     * @return array<string, int>
     */
    private function countByAssignedUser(bool $protectiveExcluded, Carbon $from, Carbon $to): array
    {
        return $this->scsrQuery($protectiveExcluded, $from, $to)
            ->leftJoin('users', 'users.id', '=', 'cases.assigned_user_id')
            ->selectRaw('users.employee_name as bucket, COUNT(*) as aggregate')
            ->groupBy('bucket')
            ->pluck('aggregate', 'bucket')
            ->mapWithKeys(fn ($count, $bucket) => [(string) ($bucket === '' ? 'unassigned' : $bucket) => (int) $count])
            ->all();
    }

    /**
     * Median rather than mean: one report left open over a holiday would drag
     * an average somewhere no actual case sits.
     */
    private function medianDaysToFinalize(bool $protectiveExcluded, Carbon $from, Carbon $to): ?float
    {
        $spans = $this->scsrQuery($protectiveExcluded, $from, $to)
            ->whereNotNull('assessments.noted_at')
            ->get(['assessments.created_at', 'assessments.noted_at'])
            ->map(fn ($row) => Carbon::parse($row->created_at)->diffInDays(Carbon::parse($row->noted_at)))
            ->sort()
            ->values();

        if ($spans->isEmpty()) {
            return null;
        }

        $middle = intdiv($spans->count(), 2);

        return $spans->count() % 2 === 1
            ? round((float) $spans[$middle], 1)
            : round(((float) $spans[$middle - 1] + (float) $spans[$middle]) / 2, 1);
    }

    /**
     * The gap the queue exists to close: cases opened in the range that never
     * got a report written.
     */
    private function casesWithoutSocialCase(bool $protectiveExcluded, Carbon $from, Carbon $to): int
    {
        return CaseModel::query()
            ->whereDoesntHave('socialCase')
            ->whereBetween('date_opened', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->when($protectiveExcluded, fn ($q) => $q->where('is_protective', false))
            ->count();
    }

    /**
     * Deliberately range-independent: what is overdue is overdue as of now,
     * regardless of which window the report covers.
     */
    private function overdueFollowUps(bool $protectiveExcluded): int
    {
        return CaseProgressNote::query()
            ->whereNotNull('follow_up_on')
            ->whereNull('follow_up_done_at')
            ->whereDate('follow_up_on', '<', now()->toDateString())
            ->whereHas('case', fn ($q) => $q
                ->whereIn('status', CaseModelService::CASELOAD_DEFAULT_STATUSES)
                ->when($protectiveExcluded, fn ($inner) => $inner->where('is_protective', false)))
            ->count();
    }

    /**
     * @return array{0: Carbon, 1: Carbon}
     */
    private function range(?string $from, ?string $to): array
    {
        $to = $to !== null ? Carbon::parse($to) : now();
        $from = $from !== null ? Carbon::parse($from) : $to->copy()->subMonth();

        // A reversed range is a typo, not a request for zero rows.
        return $from->lessThanOrEqualTo($to) ? [$from, $to] : [$to, $from];
    }
}
