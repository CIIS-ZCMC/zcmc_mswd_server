<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Shapes a hospital (SQL Server) patient record. Personal data is sourced from
 * the linked `psPersonaldata` entity via HospitalPatient::toPatientAttributes()
 * — the single place the Bizbox schema is translated — so callers never see raw
 * HIS columns and unknown fields are omitted rather than guessed. Transactions
 * appear only where the relation was eager-loaded (the aggregate show(), not the
 * list endpoints).
 */
class HospitalPatientResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->getKey(),
            'hospital_number' => $this->hospital_number,
            'display_name' => $this->displayName(),
            'personal_data' => $this->whenLoaded('personalData', fn () => $this->personalDataBlock()),
            'transactions' => PatientTransactionResource::collection($this->whenLoaded('transactions')),
        ];
    }

    /**
     * The mapped personal-data block, minus the local-column bridge key that
     * toPatientAttributes() adds for the registration flow.
     *
     * @return array<string, mixed>
     */
    protected function personalDataBlock(): array
    {
        $attributes = $this->resource->toPatientAttributes();

        unset($attributes['hospital_id']);

        return $attributes;
    }
}
