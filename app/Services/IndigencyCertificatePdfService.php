<?php

namespace App\Services;

use App\Models\AcknowledgementSlipPrintLog;
use App\Models\AssistantType;
use App\Models\Bizbox\PatientTransaction;
use App\Models\Signatory;
use App\Models\User;
use Barryvdh\DomPDF\Facade\Pdf;
use Barryvdh\DomPDF\PDF as DomPdf;

/**
 * The "Certificate of Eligibility (Indigency)", Annex A, printed per HIS encounter
 * for Malasakit Center assistance. The patient comes from the registry (or HIS);
 * the classification and services availed are picked in the print dialog and not
 * stored; the MSWD Head signs from Library → Signatories. See
 * docs/INDIGENCY_CERTIFICATE_PLAN.md.
 */
class IndigencyCertificatePdfService
{
    /** The Library signatory role printed under "Issued by". */
    public const SIGNER_ROLE = 'mswd_head';

    /** The participating hospital printed on the "from" line. */
    public const HOSPITAL = 'ZAMBOANGA CITY MEDICAL CENTER';

    /** MSWD classification code => printed label ("D-Financially Incapable"). */
    public const CLASSIFICATIONS = [
        'A' => 'Financially Capable',
        'B' => 'Partially Financially Capable',
        'C1' => 'Partially Financially Capable',
        'C2' => 'Partially Financially Capable',
        'C3' => 'Partially Financially Capable',
        'D' => 'Financially Incapable',
    ];

    public function __construct(protected AcknowledgementSlipPdfService $slips) {}

    public function hisEncounter(int|string $transactionId): PatientTransaction
    {
        return $this->slips->hisEncounter($transactionId);
    }

    /**
     * @param  array{assistant_type_ids?: list<int|string>|null, classification?: string|null}  $options
     */
    public function render(PatientTransaction $encounter, array $options = []): DomPdf
    {
        return Pdf::loadView('pdf.indigency-certificate', $this->certificate($encounter, $options))
            ->setPaper('letter', 'portrait');
    }

    public function filename(PatientTransaction $encounter): string
    {
        return "INDIGENCY-CERT-{$encounter->patient?->patid}-{$encounter->getKey()}.pdf";
    }

    public function recordPrint(PatientTransaction $encounter, User $user, ?string $remarks = null): AcknowledgementSlipPrintLog
    {
        return AcknowledgementSlipPrintLog::create([
            'form' => 'indigency',
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
    public function certificate(PatientTransaction $encounter, array $options = []): array
    {
        $patient = $this->slips->patientFor($encounter);

        $name = collect([$patient->first_name, $patient->middle_name, $patient->last_name, $patient->extension_name])
            ->filter()->join(' ');

        $address = filled($patient->permanent_address)
            ? $patient->permanent_address
            : collect([$patient->address, $patient->barangay, $patient->municipality, $patient->province])->filter()->join(', ');

        $code = $options['classification'] ?? null;
        $signer = Signatory::activeFor(self::SIGNER_ROLE);

        return [
            'name' => mb_strtoupper($name),
            'address' => mb_strtoupper((string) $address),
            'classification' => $code ? "{$code}-".self::CLASSIFICATIONS[$code] : null,
            'services' => $this->services(array_map('intval', $options['assistant_type_ids'] ?? [])),
            'hospital' => self::HOSPITAL,
            'date' => now()->format('j-M-y'),
            'signerName' => $signer?->name ? mb_strtoupper($signer->name) : null,
            'signerLicense' => $signer?->license_no,
        ];
    }

    /**
     * The picked Types of Assistance as one line, in the order picked:
     * "LABORATORY/X-RAY". Retired types still print by name.
     *
     * @param  list<int>  $typeIds
     */
    private function services(array $typeIds): ?string
    {
        if ($typeIds === []) {
            return null;
        }

        $names = AssistantType::withTrashed()->whereIn('id', $typeIds)->pluck('name', 'id');

        return collect($typeIds)
            ->map(fn (int $id) => $names[$id] ?? null)
            ->filter()
            ->map(fn (string $name) => mb_strtoupper($name))
            ->join('/');
    }
}
