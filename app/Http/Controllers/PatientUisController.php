<?php

namespace App\Http\Controllers;

use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\UisPrintLog;
use App\Services\UisReadinessService;
use App\Services\UisSocioeconomicImporter;
use App\Support\UisExpenseSlots;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controllers\HasMiddleware;
use Illuminate\Routing\Controllers\Middleware;
use Illuminate\Support\Collection;

/**
 * A patient's Unified Intake Sheets in one request: one row per Intake
 * Assessment (= one HIS encounter), with or without a case, plus a row for each
 * case that has no intake yet. Each row carries the readiness, print stats and
 * the encounter's guarantors. Backs the patient-page UIS tab.
 *
 * The UIS is the encounter's intake-time assessment (social_case_status IS NULL);
 * `has_social_case` flags a case whose assessment was promoted to the SCSR. See
 * docs/INTAKE_ASSESSMENT_PLAN.md.
 */
class PatientUisController extends Controller implements HasMiddleware
{
    public static function middleware(): array
    {
        return [new Middleware('permission:intake.view')];
    }

    public function __invoke(
        Request $request,
        Patient $patient,
        UisReadinessService $readiness,
        UisSocioeconomicImporter $socioeconomic,
    ): JsonResponse {
        // The patient's newest socio-economic record, once: every row compares its own
        // imported record against it. One query, not one per row.
        $latestRecord = $socioeconomic->latestFor($patient);
        // Household size as the MSWD classification counts it (CalculateMswdClassificationAction):
        // the patient plus every family member. One query for the patient, not one per row.
        // This is today's household, used for a case with no intake yet; an intake
        // reports the size it froze (see docs/UIS_SNAPSHOT_PLAN.md).
        $familyCount = $patient->familyMembers()->count();
        $hasFamily = $familyCount > 0;
        $householdSize = $familyCount + 1;

        $cases = $patient->cases()
            ->withExists(['patientAssistances', 'socialCase'])
            ->latest('date_opened')->latest('id')
            ->get()
            ->keyBy('id');

        // The latest intake per encounter (a reassessment supersedes its parent).
        $intakes = Assessment::query()
            ->where('patient_id', $patient->id)
            ->whereNull('social_case_status')
            ->with(['expenses', 'interviewedBy', 'uisSnapshotBy'])
            ->latest()->latest('id')
            ->get()
            ->unique(fn (Assessment $intake) => $this->encounterKey($intake->his_transaction_id, $intake->case_id));

        $guarantees = $this->guaranteeStats($patient);
        $prints = UisPrintLog::query()->where('patient_id', $patient->id)->get(['case_id', 'transaction_id', 'printed_at']);

        $rows = $intakes->map(fn (Assessment $intake) => [
            'intake' => $intake,
            'case' => $intake->case_id !== null ? $cases->get($intake->case_id) : null,
            'transaction_id' => $intake->his_transaction_id,
        ]);

        // Cases whose encounter has no intake yet: the tab offers "Assess" on them.
        $covered = $rows->map(fn (array $row) => $this->encounterKey($row['transaction_id'], $row['case']?->id))->flip();
        $cases->each(function (CaseModel $case) use (&$rows, $covered) {
            if (! $covered->has($this->encounterKey($case->transaction_id, $case->id))) {
                $rows->push(['intake' => null, 'case' => $case, 'transaction_id' => $case->transaction_id]);
            }
        });

        $data = $rows
            ->sortByDesc(fn (array $row) => (string) ($row['case']?->date_opened ?? $row['intake']?->encounter_date ?? $row['intake']?->created_at))
            ->values()
            ->map(function (array $row) use ($readiness, $hasFamily, $householdSize, $guarantees, $prints, $request, $latestRecord) {
                /** @var Assessment|null $intake */
                ['intake' => $intake, 'case' => $case, 'transaction_id' => $transactionId] = $row;

                $guarantee = $transactionId !== null ? $guarantees->get($transactionId) : null;
                // The encounter's prints, and the case's own (as UisPrintLogService::forEncounter()).
                $rowPrints = $prints->filter(fn (UisPrintLog $log) => ($transactionId !== null && (string) $log->transaction_id === (string) $transactionId)
                    || ($case !== null && $log->case_id === $case->id));

                return [
                    'encounter' => [
                        'transaction_id' => $transactionId,
                        'transaction_type' => $intake?->transaction_type ?? $case?->transaction_type,
                        'date' => $intake?->encounter_date ?? $case?->date_opened,
                    ],
                    'case' => $case === null ? null : [
                        'id' => $case->id,
                        'case_code' => $case->case_code,
                        'status' => $case->status,
                        'transaction_id' => $case->transaction_id,
                        'transaction_type' => $case->transaction_type,
                        'date_opened' => $case->date_opened,
                    ],
                    'guarantees' => [
                        'count' => $guarantee['count'] ?? 0,
                        'total' => $guarantee['total'] ?? 0.0,
                    ],
                    'uis' => $readiness->build(
                        assessment: $intake,
                        hasFamily: $hasFamily,
                        hasAssistance: $guarantee !== null || (bool) $case?->patient_assistances_exists,
                        printCount: $rowPrints->count(),
                        lastPrintedAt: $rowPrints->max('printed_at')?->toDateTimeString(),
                    ) + [
                        'has_social_case' => (bool) $case?->social_case_exists,
                        // The intake's frozen household; today's for a case with no intake.
                        'household_size' => $intake?->household_size ?? $householdSize,
                        // ANNEX B section III amounts, matched by the same code the PDF uses.
                        'expense_slots' => $intake === null ? null : UisExpenseSlots::slots($intake->expenses),
                        // Where section III and the income come from: the patient's newest
                        // record, and whether this sheet already took it. A worker who has
                        // since recorded a newer one is offered a Refresh.
                        'socioeconomic' => [
                            'latest_id' => $latestRecord?->id,
                            'latest_recorded_on' => $latestRecord?->recorded_on?->toDateString(),
                            'imported_id' => $intake?->socioeconomic_profile_id,
                            'newer_available' => $intake !== null
                                && $latestRecord !== null
                                && $latestRecord->id !== $intake->socioeconomic_profile_id,
                        ],
                        'assessment' => $intake === null ? null : $this->intakePayload($intake, $request, $householdSize),
                    ],
                ];
            });

        return response()->json(['data' => $data]);
    }

    /**
     * The intake as the client reads it. `household_size` is the size the intake
     * froze; a row from before snapshots falls back to today's household.
     *
     * @return array<string, mixed>
     */
    private function intakePayload(Assessment $intake, Request $request, int $householdSize): array
    {
        $payload = AssessmentResource::make($intake)->resolve($request);
        $payload['household_size'] ??= $householdSize;

        return $payload;
    }

    /** One UIS per HIS encounter; a case with no encounter is its own. */
    private function encounterKey(int|string|null $transactionId, ?int $caseId): string
    {
        return $transactionId !== null ? "enc-{$transactionId}" : "case-{$caseId}";
    }

    /**
     * The patient's guarantors per HIS encounter: how many, and their total.
     *
     * @return Collection<int|string, array{count: int, total: float}>
     */
    private function guaranteeStats(Patient $patient): Collection
    {
        return PatientGuarantee::query()
            ->where('patient_id', $patient->id)
            ->withSum('items', 'amount')
            ->get(['id', 'his_transaction_id'])
            ->groupBy('his_transaction_id')
            ->map(fn (Collection $group) => [
                'count' => $group->count(),
                'total' => round((float) $group->sum('items_sum_amount'), 2),
            ]);
    }
}
