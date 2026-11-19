<?php

namespace App\Http\Resources;

use App\Models\PatientGuarantee;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * A guarantee on the Approvals list: who it is for, who guarantees it, how much.
 *
 * @mixin PatientGuarantee
 */
class PendingGuaranteeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'patient' => $this->patient === null ? null : [
                'id' => $this->patient->id,
                'name' => trim("{$this->patient->last_name}, {$this->patient->first_name}"),
                'hospital_id' => $this->patient->hospital_id,
            ],
            'his_transaction_id' => $this->his_transaction_id,
            'guarantor' => $this->guarantor?->name,
            'reference_no' => $this->reference_no,
            'guaranteed_on' => $this->guaranteed_on?->toDateString(),
            'total' => $this->total(),
            'recorded_by' => $this->recordedBy?->employee_name,
            'created_at' => $this->created_at,
        ];
    }
}
