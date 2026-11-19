<?php

namespace App\Services;

use App\Models\CaseModel;
use App\Models\PatientGuarantee;
use App\Models\User;
use Illuminate\Support\Carbon;

/**
 * Figures for the dashboard cards that no existing endpoint serves.
 */
class DashboardService
{
    /**
     * Guarantee amounts per day and guarantor, for a date range. Counts a
     * guarantee on the day it was guaranteed, and only once it needs no sign-off
     * or has had it. Patients with a protective case are left out for a viewer
     * without `audit.view_protective`, as in the turnaround report.
     *
     * @return array{from: string, to: string, protective_excluded: bool, total: float, days: list<array{date: string, total: float, by_guarantor: array<string, float>}>}
     */
    public function guaranteeTotals(?string $from, ?string $to, ?User $viewer): array
    {
        $end = $to !== null ? Carbon::parse($to)->startOfDay() : today();
        $start = $from !== null ? Carbon::parse($from)->startOfDay() : $end->copy()->subDays(6);

        if ($start->greaterThan($end)) {
            [$start, $end] = [$end, $start];
        }

        $protectiveExcluded = ! ($viewer?->can('audit.view_protective') ?? false);

        $guarantees = PatientGuarantee::query()
            ->whereIn('approval_status', [PatientGuarantee::APPROVAL_NOT_REQUIRED, PatientGuarantee::APPROVAL_APPROVED])
            ->whereDate('guaranteed_on', '>=', $start->toDateString())
            ->whereDate('guaranteed_on', '<=', $end->toDateString())
            ->when($protectiveExcluded, fn ($q) => $q->whereNotIn('patient_id', CaseModel::query()
                ->withTrashed()
                ->where('is_protective', true)
                ->select('patient_id')))
            ->with('guarantor:id,name')
            ->withSum('items', 'amount')
            ->get(['id', 'guarantor_id', 'guaranteed_on']);

        $days = [];

        for ($day = $start->copy(); $day->lessThanOrEqualTo($end); $day->addDay()) {
            $date = $day->toDateString();

            $byGuarantor = $guarantees
                ->filter(fn (PatientGuarantee $guarantee) => $guarantee->guaranteed_on->toDateString() === $date)
                ->groupBy(fn (PatientGuarantee $guarantee) => $guarantee->guarantor?->name ?? 'Other')
                ->map(fn ($group) => round((float) $group->sum('items_sum_amount'), 2))
                ->sortKeys()
                ->all();

            $days[] = [
                'date' => $date,
                'total' => round(array_sum($byGuarantor), 2),
                'by_guarantor' => $byGuarantor,
            ];
        }

        return [
            'from' => $start->toDateString(),
            'to' => $end->toDateString(),
            'protective_excluded' => $protectiveExcluded,
            'total' => round(array_sum(array_column($days, 'total')), 2),
            'days' => $days,
        ];
    }
}
