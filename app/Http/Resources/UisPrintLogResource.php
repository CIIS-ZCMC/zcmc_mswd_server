<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UisPrintLogResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'patient_id' => $this->patient_id,
            'transaction_id' => $this->transaction_id,
            'printed_by' => $this->whenLoaded('printedBy', fn () => [
                'id' => $this->printedBy?->id,
                'name' => $this->printedBy?->employee_name,
            ]),
            'printed_at' => $this->printed_at,
            'copies' => $this->copies,
            'remarks' => $this->remarks,
            'created_at' => $this->created_at,
        ];
    }
}
