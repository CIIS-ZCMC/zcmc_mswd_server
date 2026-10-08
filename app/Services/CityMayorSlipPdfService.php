<?php

namespace App\Services;

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\PatientTransaction;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Support\Carbon;

/**
 * The City Mayor "Acknowledgement Slip (Medical Assistance)", ZCMC-F-MSS-04, printed
 * per HIS encounter. The patient, diagnosis and socio-economic lines come from the
 * registry (or HIS); the fund, amount and "para sa" type are picked in the print
 * dialog and not stored. See docs/CITY_MAYOR_SLIP_PLAN.md.
 */
class CityMayorSlipPdfService
{
    /** "tulong na nagmula sa" boxes, in the paper form's order: key => printed label. */
    public const FUNDS = [
        'city_grant' => 'CITY GRANT IN AID',
        'dswd' => 'DSWD',
        'pcso' => 'PHILIPPINE CHARITY SWEEPSTAKES',
        'armm' => 'ARMM',
        'others' => 'Others please specify',
    ];

    /**
     * The paper form's "Para sa" order, by Type of Assistance code. Types added in
     * the Library since print after these, oldest first.
     */
    public const PAPER_ORDER = [
        'medicines', 'laboratory', 'xray_ultrasound_diagnostics', 'hospital_bills',
        'supplies', 'hemodialysis', 'rehab', 'ecg',
    ];

    public function __construct(protected AcknowledgementSlipPdfService $slips) {}

    public function hisEncounter(int|string $transactionId): PatientTransaction
    {
        return $this->slips->hisEncounter($transactionId);
    }

    /**
     * @param  array{assistant_type_ids?: list<int|string>|null, fund?: string|null, fund_other?: string|null, amount?: float|string|null, time_started?: string|null, time_ended?: string|null}  $options
     */
    public function render(PatientTransaction $encounter, array $options = [], ?User $printedBy = null): DomPdf
    {
        return Pdf::loadView('pdf.city-mayor-slip', $this->slip($encounter, $options, $printedBy))
            ->setPaper('letter', 'portrait');
    }

    public function filename(PatientTransaction $encounter): string
    {
        return "CITY-MAYOR-SLIP-{$encounter->patient?->patid}-{$encounter->getKey()}.pdf";
    }

    public function recordPrint(PatientTransaction $encounter, User $user, ?string $remarks = null): AcknowledgementSlipPrintLog
    {
        return AcknowledgementSlipPrintLog::create([
            'form' => 'city_mayor',
            'patient_id' => $this->slips->registryPatient($encounter)?->id,
            'his_transaction_id' => $encounter->getKey(),
            'printed_by' => $user->id,
            'printed_at' => now(),
            'copies' => 1,
            'remarks' => $remarks,
        ]);
    }

    /**
     * The values the template prints, already formatted. Blank values keep the
     * ruled line for handwriting.
     *
     * @param  array<string, mixed>  $options
     * @return array<string, mixed>
     */
    public function slip(PatientTransaction $encounter, array $options = [], ?User $printedBy = null): array
    {
        $patient = $this->slips->patientFor($encounter);
        $today = now();

        $name = collect([$patient->first_name, $patient->middle_name, $patient->last_name, $patient->extension_name])
            ->filter()->join(' ');

        $age = $patient->birthdate
            ? (int) Carbon::parse($patient->birthdate)->diffInYears($today)
            : $patient->estimated_age;

        $address = filled($patient->permanent_address)
            ? $patient->permanent_address
            : collect([$patient->address, $patient->barangay, $patient->municipality, $patient->province])->filter()->join(', ');

        // Household size: the registry's family members plus the patient. A HIS-only
        // patient has no family on file, so the line stays blank.
        $members = $patient->exists ? $patient->familyMembers()->count() + 1 : null;

        $typeIds = array_map('intval', $options['assistant_type_ids'] ?? []);
        $fund = $options['fund'] ?? 'city_grant';
        $amount = $options['amount'] ?? null;

        return [
            'name' => mb_strtoupper($name),
            'age' => $age,
            'sex' => mb_strtoupper((string) $patient->sex),
            'civilStatus' => mb_strtoupper((string) $patient->civil_status),
            'address' => mb_strtoupper((string) $address),
            'education' => mb_strtoupper((string) $patient->educational_attainment),
            'birthdate' => $patient->birthdate ? Carbon::parse($patient->birthdate)->format('m/d/Y') : null,
            'religion' => mb_strtoupper((string) $patient->religion),
            'occupation' => mb_strtoupper((string) $patient->occupation),
            'income' => filled($patient->monthly_income) ? number_format((float) $patient->monthly_income, 2) : null,
            'members' => $members,
            'diagnosis' => mb_strtoupper((string) $this->slips->encounterDiagnosis($encounter)),
            'funds' => self::FUNDS,
            'fund' => $fund,
            'fundOther' => $fund === 'others' ? mb_strtoupper((string) ($options['fund_other'] ?? '')) : null,
            'amount' => filled($amount) ? number_format((float) $amount, 2) : null,
            'types' => $this->checklist($typeIds),
            'typeIds' => $typeIds,
            'date' => $today->format('m/d/Y'),
            'socialWorker' => $printedBy?->employee_name,
            'socialWorkerLicense' => $printedBy?->license_no,
            'socialWorkerPosition' => $printedBy?->position,
            'hospitalNumber' => $patient->hospital_id ?? $encounter->patient?->patid,
            'mswdNumber' => $patient->mswd_id ?: 'N/A',
            'timeStarted' => $this->slips->clock($options['time_started'] ?? null),
            'timeEnded' => $this->slips->clock($options['time_ended'] ?? null),
        ];
    }

    /**
     * The "Para sa" checklist, id => name: the Library's active types (plus any
     * picked ones retired since), in the paper form's order.
     *
     * @param  list<int>  $typeIds
     * @return array<int, string>
     */
    private function checklist(array $typeIds): array
    {
        $rank = array_flip(self::PAPER_ORDER);

        return AssistantType::withTrashed()
            ->where(fn ($query) => $query->where('is_active', true)->whereNull('deleted_at')
                ->when($typeIds !== [], fn ($q) => $q->orWhereIn('id', $typeIds)))
            ->orderBy('id')
            ->get(['id', 'code', 'name'])
            ->sortBy(fn (AssistantType $type) => [$rank[$type->code] ?? count($rank), $type->id])
            ->pluck('name', 'id')
            ->all();
    }
}
