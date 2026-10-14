<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\ServiceVisit;
use App\Models\TurnaroundTarget;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Support\Carbon;

/**
 * Turnaround time (TAT) of MSWD visits over a date range, docs/TURNAROUND_TIME_PLAN.md
 * Phase 4: per stage, per serving worker and per day, with compliance against the
 * Library targets.
 *
 * A visit counts on the day it was completed (cancelled visits on the day they were
 * cancelled). The completed visits are loaded once and every figure is computed in
 * PHP from them: medians and percentiles have no portable SQL form, and a day's
 * visits number in the dozens. Visits of a patient with a protective case are left
 * out for a viewer without `audit.view_protective`, and the response says so.
 */
class TurnaroundReportService
{
    /**
     * @return array<string, mixed>
     */
    public function summary(?User $viewer, ?string $from, ?string $to): array
    {
        [$from, $to] = $this->range($from, $to);
        $protectiveExcluded = ! ($viewer?->can('audit.view_protective') ?? false);
        $targets = TurnaroundTarget::activeMinutes();

        $completed = $this->completedVisits($protectiveExcluded, $from, $to);

        return [
            'from' => $from->toDateString(),
            'to' => $to->toDateString(),
            // Never let a filtered total read as a complete one.
            'protective_excluded' => $protectiveExcluded,
            'targets' => collect(TurnaroundTarget::STAGES)->mapWithKeys(fn ($stage) => [$stage => $targets[$stage] ?? null])->all(),
            'completed' => $completed->count(),
            'cancelled' => $this->cancelledCount($protectiveExcluded, $from, $to),
            'stages' => [
                TurnaroundTarget::STAGE_WAITING => $this->stats($completed->map->waitingMinutes()->all(), $targets[TurnaroundTarget::STAGE_WAITING] ?? null),
                TurnaroundTarget::STAGE_PROCESSING => $this->stats($completed->map->processingMinutes()->all(), $targets[TurnaroundTarget::STAGE_PROCESSING] ?? null),
                TurnaroundTarget::STAGE_TOTAL => $this->stats($completed->map->totalMinutes()->all(), $targets[TurnaroundTarget::STAGE_TOTAL] ?? null),
            ],
            'by_employee' => $completed
                ->groupBy('served_by')
                ->map(fn (Collection $visits) => [
                    'user_id' => $visits->first()->served_by,
                    'name' => $visits->first()->servedBy?->employee_name ?? $visits->first()->servedBy?->email ?? 'Unknown',
                    ...$this->stats($visits->map->totalMinutes()->all(), $targets[TurnaroundTarget::STAGE_TOTAL] ?? null),
                ])
                ->sortBy('name', SORT_NATURAL | SORT_FLAG_CASE)
                ->values()
                ->all(),
            'by_day' => $completed
                ->groupBy(fn (ServiceVisit $visit) => $visit->completed_at->toDateString())
                ->map(fn (Collection $visits, string $date) => [
                    'date' => $date,
                    ...$this->stats($visits->map->totalMinutes()->all(), $targets[TurnaroundTarget::STAGE_TOTAL] ?? null),
                ])
                ->sortKeys()
                ->values()
                ->all(),
        ];
    }

    /**
     * The same dataset flattened for CSV: one row per stage, worker and day, each
     * with the same statistic columns, so a spreadsheet can pivot it.
     *
     * @return array{headers: list<string>, rows: list<list<string|int|float>>}
     */
    public function toRows(array $summary): array
    {
        $row = fn (string $group, string $label, array $stats) => [
            $group, $label, $stats['count'], $stats['avg'] ?? '', $stats['median'] ?? '',
            $stats['p90'] ?? '', $stats['max'] ?? '', $stats['within_target_pct'] ?? '',
        ];

        $rows = [];

        foreach ($summary['stages'] as $stage => $stats) {
            $rows[] = $row('stage', $stage, $stats);
        }

        foreach ($summary['by_employee'] as $employee) {
            $rows[] = $row('employee', $employee['name'], $employee);
        }

        foreach ($summary['by_day'] as $day) {
            $rows[] = $row('day', $day['date'], $day);
        }

        $rows[] = ['cancelled', 'visits', $summary['cancelled'], '', '', '', '', ''];

        return [
            'headers' => ['group', 'label', 'count', 'avg_minutes', 'median_minutes', 'p90_minutes', 'max_minutes', 'within_target_pct'],
            'rows' => $rows,
        ];
    }

    public function renderPdf(array $summary): DomPdf
    {
        return Pdf::loadView('pdf.turnaround-report', ['summary' => $summary])->setPaper('a4', 'portrait');
    }

    public function basename(array $summary): string
    {
        return "turnaround-time-{$summary['from']}-to-{$summary['to']}";
    }

    /**
     * Count, average, median, 90th percentile and maximum of a set of durations, and
     * the share within the stage's target (null when the target is inactive).
     *
     * @param  list<int|null>  $minutes
     * @return array{count: int, avg: float|null, median: float|null, p90: int|null, max: int|null, within_target_pct: float|null}
     */
    public function stats(array $minutes, ?int $target): array
    {
        $values = collect($minutes)->filter(fn ($m) => $m !== null)->sort()->values();
        $count = $values->count();

        if ($count === 0) {
            return ['count' => 0, 'avg' => null, 'median' => null, 'p90' => null, 'max' => null, 'within_target_pct' => null];
        }

        $middle = intdiv($count, 2);

        return [
            'count' => $count,
            'avg' => round($values->avg(), 1),
            // Median beside the mean: one visit left open over lunch drags an average.
            'median' => $count % 2 === 1
                ? (float) $values[$middle]
                : round(($values[$middle - 1] + $values[$middle]) / 2, 1),
            // Nearest-rank: the duration 90% of visits finished within.
            'p90' => (int) $values[(int) ceil(0.9 * $count) - 1],
            'max' => (int) $values->last(),
            'within_target_pct' => $target === null
                ? null
                : round(100 * $values->filter(fn ($m) => $m <= $target)->count() / $count, 1),
        ];
    }

    /**
     * @return Collection<int, ServiceVisit>
     */
    private function completedVisits(bool $protectiveExcluded, Carbon $from, Carbon $to): Collection
    {
        return $this->scoped($protectiveExcluded)
            ->where('status', ServiceVisit::STATUS_COMPLETED)
            ->whereBetween('completed_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->with('servedBy:id,employee_name,email')
            ->get(['id', 'patient_id', 'status', 'arrived_at', 'started_at', 'completed_at', 'served_by']);
    }

    private function cancelledCount(bool $protectiveExcluded, Carbon $from, Carbon $to): int
    {
        return $this->scoped($protectiveExcluded)
            ->where('status', ServiceVisit::STATUS_CANCELLED)
            ->whereBetween('cancelled_at', [$from->copy()->startOfDay(), $to->copy()->endOfDay()])
            ->count();
    }

    /**
     * A visit has no case of its own, so the protective filter works at the patient:
     * any protective case (even a deleted one) keeps all their visits out.
     *
     * @return Builder<ServiceVisit>
     */
    private function scoped(bool $protectiveExcluded): Builder
    {
        return ServiceVisit::query()
            ->when($protectiveExcluded, fn (Builder $q) => $q->whereNotIn('patient_id', CaseModel::query()
                ->withTrashed()
                ->where('is_protective', true)
                ->select('patient_id')));
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
