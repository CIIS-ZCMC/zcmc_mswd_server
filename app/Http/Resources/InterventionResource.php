<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class InterventionResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'created_by' => $this->created_by,
            'intervention_type_id' => $this->intervention_type_id,
            'description' => $this->description,
            'date_given' => $this->date_given,
            'outcome' => $this->outcome,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
