<?php

namespace App\Http\Resources;

use App\Models\PatientGuarantee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * An MSWD patient guarantor on one hospital encounter, with its breakdown lines and
 * their total. Not the HIS guarantor ledger (see PatientGuarantorResource).
 *
 * @mixin PatientGuarantee
 */
class PatientGuaranteeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient_id' => $this->patient_id,
            'his_transaction_id' => $this->his_transaction_id,
            'hospital_id' => $this->hospital_id,
            'guarantor' => $this->whenLoaded('guarantor', fn () => $this->guarantor === null ? null : [
                'id' => $this->guarantor->id,
                'name' => $this->guarantor->name,
            ]),
            'reference_no' => $this->reference_no,
            'guaranteed_on' => $this->guaranteed_on?->toDateString(),
            'remarks' => $this->remarks,
            'items' => $this->whenLoaded('items', fn () => $this->items->map(fn ($item) => [
                'id' => $item->id,
                'source' => $item->source === null ? null : [
                    'id' => $item->source->id,
                    'name' => $item->source->name,
                    'requires_specify' => $item->source->requires_specify,
                ],
                'others_specify' => $item->others_specify,
                'amount' => (float) $item->amount,
            ])->all()),
            'total' => $this->total(),
            'recorded_by' => $this->whenLoaded('recordedBy', fn () => $this->recordedBy === null ? null : [
                'id' => $this->recordedBy->id,
                'name' => $this->recordedBy->employee_name,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
