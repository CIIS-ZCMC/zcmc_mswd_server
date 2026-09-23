<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CaseHospitalTransactionResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'his_transaction_id' => $this->his_transaction_id,
            'hospital_id' => $this->hospital_id,
            'snapshot' => $this->snapshot,
            'linked_by' => $this->linked_by,
            'linked_at' => $this->linked_at,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
