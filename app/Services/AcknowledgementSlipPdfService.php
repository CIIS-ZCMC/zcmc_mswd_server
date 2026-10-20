<?php

namespace App\Services;

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\PatientGuarantors;
use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseHospitalTransaction;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use App\Models\ServiceVisit;
use App\Models\Signatory;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Database\QueryException;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;

/**
 * The DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46). The patient acknowledges an
 * amount "para sa" its types of assistance. Two sources:
 *  - an MSWD guarantee (guarantor MAIFIP): its total and breakdown types;
 *  - the HIS guarantor ledger's MAIFIP entry on an encounter: the HIS amount and
 *    post date; HIS has no types of assistance, so "para sa" is the types picked
 *    at print time (blank when none are picked).
 * The DOH-MAIFIP box is always ticked. See docs/ACKNOWLEDGEMENT_SLIP_PLAN.md.
 */
class AcknowledgementSlipPdfService
{
    /** The approver printed under "Inaprobahan ni". */
    public const APPROVER_ROLE = 'allied_health_chief';

    /** The slip's fund boxes, in the paper form's order: key => printed label. */
    public const FUNDS = [
        'doh_maifip' => 'DOH-MAIFIP',
        'opav_socio_civid_fund' => 'OPAV-SOCIO CIVID FUND',
        'others' => 'OTHERS',
    ];

    public function __construct(protected PatientTransactionService $transactions) {}

    // ---- From an MSWD guarantee ----------------------------------------------------

    public function render(
        PatientGuarantee $guarantee,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): DomPdf {
        return $this->pdf($this->slip($guarantee, $printedBy, $timeStarted, $timeEnded, $fund, $fundOther));
    }

    public function filename(PatientGuarantee $guarantee): string
    {
        $patient = $guarantee->patient;
        $ref = $patient?->mswd_id ?: $patient?->hospital_id ?: $guarantee->patient_id;

        return "ACK-SLIP-{$ref}-{$guarantee->id}.pdf";
    }

    /** Record one print of the slip (not on preview). */
    public function recordPrint(PatientGuarantee $guarantee, User $user, int $copies = 1, ?string $remarks = null): AcknowledgementSlipPrintLog
    {
        return $this->log([
            'patient_guarantee_id' => $guarantee->id,
            'patient_id' => $guarantee->patient_id,
            'his_transaction_id' => $guarantee->his_transaction_id,
        ], $user, $copies, $remarks);
    }

    /**
     * The values the template prints, already formatted. Blank values keep the
     * ruled line for handwriting.
     *
     * @return array<string, mixed>
     */
    public function slip(
        PatientGuarantee $guarantee,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): array {
        $guarantee->loadMissing(['patient', 'items.assistanceType']);

        $purpose = $guarantee->items
            ->map(fn ($item) => $item->assistanceType?->name)
            ->filter()
            ->unique()
            ->join('/');

        [$timeStarted, $timeEnded] = $this->timesOrService($guarantee->patient_id, $guarantee->his_transaction_id, $timeStarted, $timeEnded);

        return $this->fields(
            $guarantee->patient,
            $guarantee->guaranteed_on ? Carbon::parse($guarantee->guaranteed_on) : now(),
            $guarantee->total(),
            $purpose,
            $this->diagnosisFor($guarantee->his_transaction_id),
            $printedBy,
            $timeStarted,
            $timeEnded,
            fallbackHospitalNumber: $guarantee->hospital_id,
            fund: $fund,
            fundOther: $fundOther,
        );
    }

    // ---- From the HIS guarantor ledger -----------------------------------------------

    /**
     * The HIS encounter with its guarantor ledger (404 when the id matches nothing).
     * A down HIS throws QueryException; the controller reports it.
     */
    public function hisEncounter(int|string $transactionId): PatientTransaction
    {
        return $this->transactions->find($transactionId);
    }

    /**
     * The encounter's MAIFIP entries on the HIS guarantor ledger.
     *
     * @return Collection<int, PatientGuarantors>
     */
    public function hisMaifipEntries(PatientTransaction $encounter): Collection
    {
        return $encounter->guarantors
            ->filter(fn (PatientGuarantors $entry) => str_contains(strtoupper((string) $entry->guarantor?->fullname), 'MAIFIP'))
            ->values();
    }

    /**
     * @param  list<int>  $assistantTypeIds  the "para sa" types, in the order picked
     */
    public function renderFromHis(
        PatientTransaction $encounter,
        PatientGuarantors $entry,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        array $assistantTypeIds = [],
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): DomPdf {
        return $this->pdf($this->slipFromHis($encounter, $entry, $printedBy, $timeStarted, $timeEnded, $assistantTypeIds, $fund, $fundOther));
    }

    public function filenameFromHis(PatientTransaction $encounter, PatientGuarantors $entry): string
    {
        return "ACK-SLIP-HIS-{$encounter->patient?->patid}-{$entry->getKey()}.pdf";
    }

    public function recordHisPrint(PatientTransaction $encounter, PatientGuarantors $entry, User $user, int $copies = 1, ?string $remarks = null): AcknowledgementSlipPrintLog
    {
        return $this->log([
            'his_guarantor_entry_id' => $entry->getKey(),
            'patient_id' => $this->registryPatient($encounter)?->id,
            'his_transaction_id' => $encounter->getKey(),
        ], $user, $copies, $remarks);
    }

    /**
     * @param  list<int>  $assistantTypeIds  the "para sa" types, in the order picked
     * @return array<string, mixed>
     */
    public function slipFromHis(
        PatientTransaction $encounter,
        PatientGuarantors $entry,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        array $assistantTypeIds = [],
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): array {
        [$timeStarted, $timeEnded] = $this->timesOrService($this->registryPatient($encounter)?->id, $encounter->getKey(), $timeStarted, $timeEnded);

        return $this->fields(
            $this->patientFor($encounter),
            $entry->postdate ? Carbon::parse($entry->postdate) : now(),
            round((float) $entry->amount, 2),
            $this->typeNames($assistantTypeIds), // HIS records none: picked at print time
            $this->encounterDiagnosis($encounter),
            $printedBy,
            $timeStarted,
            $timeEnded,
            fallbackHospitalNumber: $encounter->patient?->patid,
            fund: $fund,
            fundOther: $fundOther,
        );
    }

    // ---- Direct from Encounter (no guarantee or manual entry) --------------------------

    public function renderFromEncounter(
        PatientTransaction $encounter,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        ?float $amount = null,
        array $assistantTypeIds = [],
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): DomPdf {
        return $this->pdf($this->slipFromEncounter($encounter, $printedBy, $timeStarted, $timeEnded, $amount, $assistantTypeIds, $fund, $fundOther));
    }

    public function filenameFromEncounter(PatientTransaction $encounter): string
    {
        return "ACK-SLIP-{$encounter->patient?->patid}-ENC-{$encounter->getKey()}.pdf";
    }

    public function recordEncounterPrint(
        PatientTransaction $encounter,
        User $user,
        int $copies = 1,
        ?string $remarks = null,
    ): AcknowledgementSlipPrintLog {
        return $this->log([
            'patient_id' => $this->registryPatient($encounter)?->id,
            'his_transaction_id' => $encounter->getKey(),
        ], $user, $copies, $remarks);
    }

    /**
     * @param  list<int>  $assistantTypeIds  the "para sa" types, in the order picked
     * @return array<string, mixed>
     */
    public function slipFromEncounter(
        PatientTransaction $encounter,
        ?User $printedBy = null,
        ?string $timeStarted = null,
        ?string $timeEnded = null,
        ?float $amount = null,
        array $assistantTypeIds = [],
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): array {
        [$timeStarted, $timeEnded] = $this->timesOrService($this->registryPatient($encounter)?->id, $encounter->getKey(), $timeStarted, $timeEnded);

        return $this->fields(
            $this->patientFor($encounter),
            now(),
            $amount,
            $this->typeNames($assistantTypeIds),
            $this->encounterDiagnosis($encounter),
            $printedBy,
            $timeStarted,
            $timeEnded,
            fallbackHospitalNumber: $encounter->patient?->patid,
            fund: $fund,
            fundOther: $fundOther,
        );
    }

    // ---- Shared (also used by CityMayorSlipPdfService) ---------------------------------

    /**
     * The encounter's patient: the registry record when imported (it has the MSWD #
     * and any edits); otherwise the HIS personal data, unsaved.
     */
    public function patientFor(PatientTransaction $encounter): Patient
    {
        return $this->registryPatient($encounter)
            ?? (new Patient)->forceFill($encounter->patient?->toPatientAttributes() ?? []);
    }

    /** The registry record of the encounter's patient (hospital_id = patid), if imported. */
    public function registryPatient(PatientTransaction $encounter): ?Patient
    {
        $patid = $encounter->patient?->patid;

        return filled($patid) ? Patient::query()->where('hospital_id', $patid)->first() : null;
    }

    /** The loaded encounter's diagnosis, else the case link's frozen snapshot. */
    public function encounterDiagnosis(PatientTransaction $encounter): ?string
    {
        return $this->diagnosisOf($encounter) ?? $this->snapshotDiagnosis($encounter->getKey());
    }

    /**
     * The encounter's queue turnaround as "H:i": start of service and completion of
     * its latest served visit (ServiceVisit::lastServedFor); nulls when there is none.
     *
     * @return array{0: string|null, 1: string|null}
     */
    private function serviceTimes(?int $patientId, int|string|null $transactionId): array
    {
        $visit = $patientId !== null && filled($transactionId)
            ? ServiceVisit::lastServedFor($patientId, (int) $transactionId)
            : null;

        return [$visit?->started_at?->format('H:i'), $visit?->completed_at?->format('H:i')];
    }

    /**
     * The times typed in the print dialog, each blank one filled from the queue.
     *
     * @return array{0: string|null, 1: string|null}
     */
    public function timesOrService(?int $patientId, int|string|null $transactionId, ?string $timeStarted, ?string $timeEnded): array
    {
        if (filled($timeStarted) && filled($timeEnded)) {
            return [$timeStarted, $timeEnded];
        }

        [$started, $ended] = $this->serviceTimes($patientId, $transactionId);

        return [filled($timeStarted) ? $timeStarted : $started, filled($timeEnded) ? $timeEnded : $ended];
    }

    /** "10:49" → "10:49 AM"; null stays blank. */
    public function clock(?string $time): ?string
    {
        return filled($time) ? Carbon::createFromFormat('H:i', $time)->format('g:i A') : null;
    }

    private function pdf(array $slip): DomPdf
    {
        return Pdf::loadView('pdf.acknowledgement-slip', $slip)->setPaper('letter', 'portrait');
    }

    /**
     * @return array<string, mixed>
     */
    private function fields(
        ?Patient $patient,
        Carbon $date,
        ?float $amount,
        ?string $purpose,
        ?string $diagnosis,
        ?User $printedBy,
        ?string $timeStarted,
        ?string $timeEnded,
        int|string|null $fallbackHospitalNumber = null,
        string $fund = 'doh_maifip',
        ?string $fundOther = null,
    ): array {
        $name = collect([$patient?->first_name, $patient?->middle_name, $patient?->last_name, $patient?->extension_name])
            ->filter()->join(' ');

        // Age as of the slip date; the estimate only when no birthdate is on file.
        $age = $patient?->birthdate
            ? (int) Carbon::parse($patient->birthdate)->diffInYears($date)
            : $patient?->estimated_age;

        $address = filled($patient?->permanent_address)
            ? $patient->permanent_address
            : collect([$patient?->address, $patient?->barangay, $patient?->municipality, $patient?->province])->filter()->join(', ');

        $approver = Signatory::activeFor(self::APPROVER_ROLE);

        return [
            'name' => mb_strtoupper($name),
            'age' => $age,
            'sex' => mb_strtoupper((string) $patient?->sex),
            'civilStatus' => mb_strtoupper((string) $patient?->civil_status),
            'address' => mb_strtoupper((string) $address),
            'diagnosis' => mb_strtoupper((string) $diagnosis),
            'amount' => $amount !== null ? number_format($amount, 2) : '',
            'purpose' => mb_strtoupper((string) $purpose),
            'date' => $date->format('j-M-y'),
            'socialWorker' => $printedBy?->employee_name,
            'approverName' => $approver?->name,
            'approverTitle' => $approver?->title,
            'hospitalNumber' => $patient?->hospital_id ?? $fallbackHospitalNumber,
            'mswdNumber' => $patient?->mswd_id,
            'timeStarted' => $this->clock($timeStarted),
            'timeEnded' => $this->clock($timeEnded),
            'fund' => array_key_exists($fund, self::FUNDS) ? $fund : 'doh_maifip',
            'fundOther' => $fund === 'others' && filled($fundOther) ? mb_strtoupper($fundOther) : null,
        ];
    }

    /**
     * An encounter's diagnosis: live from the HIS; the case link's frozen snapshot
     * when the HIS is unreachable; blank when neither has one.
     */
    private function diagnosisFor(?int $hisTransactionId): ?string
    {
        if ($hisTransactionId === null) {
            return null;
        }

        try {
            $live = $this->diagnosisOf($this->transactions->find($hisTransactionId));

            if ($live !== null) {
                return $live;
            }
        } catch (QueryException|ModelNotFoundException $e) {
            report($e);
        }

        return $this->snapshotDiagnosis($hisTransactionId);
    }

    /**
     * Library type names joined with "/" in the order given (blank when none).
     *
     * @param  list<int>  $ids
     */
    private function typeNames(array $ids): ?string
    {
        if ($ids === []) {
            return null;
        }

        $names = AssistantType::withTrashed()->whereIn('id', $ids)->pluck('name', 'id');

        return collect($ids)->map(fn ($id) => $names[$id] ?? null)->filter()->unique()->join('/');
    }

    /** Final diagnosis, else the doctor's impression, else the discharge diagnosis. */
    private function diagnosisOf(PatientTransaction $encounter): ?string
    {
        return collect([$encounter->finaldiagnosis, $encounter->impression, $encounter->dischdiagnosis])
            ->map(fn ($value) => trim((string) $value))
            ->first(fn ($value) => $value !== '');
    }

    private function snapshotDiagnosis(int|string $hisTransactionId): ?string
    {
        $snapshot = CaseHospitalTransaction::query()
            ->where('his_transaction_id', $hisTransactionId)
            ->value('snapshot');

        $snapshot = is_string($snapshot) ? json_decode($snapshot, true) : $snapshot;

        return $snapshot['final_diagnosis'] ?? $snapshot['impression'] ?? null;
    }

    /**
     * @param  array<string, mixed>  $source
     */
    private function log(array $source, User $user, int $copies, ?string $remarks): AcknowledgementSlipPrintLog
    {
        return AcknowledgementSlipPrintLog::create([
            ...$source,
            'printed_by' => $user->id,
            'printed_at' => now(),
            'copies' => max(1, $copies),
            'remarks' => $remarks,
        ]);
    }
}
