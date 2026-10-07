<?php

namespace App\Services;

use App\Models\Bizbox\PatientTransaction;
use App\Models\Patient;
use App\Models\PatientGuarantee;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Writes and reads for the MSWD's patient guarantors: one guarantor per hospital
 * (HIS) encounter with a breakdown of assistance sources. The encounter is read live
 * from the HIS only to check it belongs to the patient; it is never copied.
 */
class PatientGuaranteeService
{
    /** Relations every guarantee is returned with. */
    public const RELATIONS = ['guarantor', 'items.assistanceType', 'items.modeOfAssistance', 'items.fundSource', 'recordedBy'];

    public function __construct(protected PatientTransactionService $transactions) {}

    /**
     * The patient's guarantees, newest first, optionally for one encounter.
     */
    public function forPatient(Patient $patient, int|string|null $hisTransactionId = null): Collection
    {
        return $patient->guarantees()
            ->with(self::RELATIONS)
            ->withSum('items', 'amount')
            ->when($hisTransactionId !== null, fn ($query) => $query->where('his_transaction_id', $hisTransactionId))
            ->orderByDesc('guaranteed_on')
            ->orderByDesc('id')
            ->get();
    }

    /**
     * @param  array<string, mixed>  $data  validated request data, with `items`
     */
    public function create(Patient $patient, array $data, int $recordedBy): PatientGuarantee
    {
        $transaction = $this->encounterOf($patient, $data['his_transaction_id']);

        return DB::transaction(function () use ($patient, $data, $recordedBy, $transaction) {
            $guarantee = $patient->guarantees()->create([
                ...$this->header($data),
                'his_transaction_id' => $transaction->getKey(),
                'hospital_id' => $transaction->patient?->patid,
                'recorded_by' => $recordedBy,
            ]);

            $this->replaceItems($guarantee, $data['items']);

            return $this->load($guarantee);
        });
    }

    /**
     * Updates the header; when `items` is sent, the breakdown is replaced as a whole.
     *
     * @param  array<string, mixed>  $data
     */
    public function update(PatientGuarantee $guarantee, array $data): PatientGuarantee
    {
        return DB::transaction(function () use ($guarantee, $data) {
            $guarantee->update($this->header($data));

            if (array_key_exists('items', $data)) {
                $this->replaceItems($guarantee, $data['items']);
            }

            return $this->load($guarantee);
        });
    }

    public function delete(PatientGuarantee $guarantee): bool
    {
        return (bool) $guarantee->delete();
    }

    public function load(PatientGuarantee $guarantee): PatientGuarantee
    {
        return $guarantee->refresh()->load(self::RELATIONS)->loadSum('items', 'amount');
    }

    /**
     * The HIS encounter, which must belong to this patient's hospital record.
     */
    private function encounterOf(Patient $patient, int|string $hisTransactionId): PatientTransaction
    {
        if (blank($patient->hospital_id)) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'This patient is not linked to a hospital record.',
            ]);
        }

        try {
            $transaction = $this->transactions->find($hisTransactionId);
        } catch (ModelNotFoundException) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'The hospital encounter was not found.',
            ]);
        }

        if ((string) $transaction->patient?->patid !== (string) $patient->hospital_id) {
            throw ValidationException::withMessages([
                'his_transaction_id' => 'This hospital encounter belongs to a different patient.',
            ]);
        }

        return $transaction;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function header(array $data): array
    {
        return array_intersect_key($data, array_flip(['guarantor_id', 'reference_no', 'guaranteed_on', 'remarks']));
    }

    /**
     * Breakdown lines have no identity of their own, so an edit replaces them. Each
     * delete and insert is still audited.
     *
     * @param  list<array<string, mixed>>  $items
     */
    private function replaceItems(PatientGuarantee $guarantee, array $items): void
    {
        $guarantee->items()->get()->each->delete();

        foreach ($items as $item) {
            $guarantee->items()->create([
                'assistant_type_id' => $item['assistant_type_id'],
                'amount' => $item['amount'],
                'mode_of_assistance_id' => $item['mode_of_assistance_id'],
                'fund_source_id' => $item['fund_source_id'],
                'others_specify' => $item['others_specify'] ?? null,
            ]);
        }
    }
}
