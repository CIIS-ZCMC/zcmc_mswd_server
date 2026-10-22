<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class GuarantorResource extends JsonResource
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
            'name' => $this->name,
            'address' => $this->address,
            'is_active' => $this->is_active,
            // Patient guarantees plus assistance records that name this guarantor, when counted.
            'usage_count' => $this->when(
                isset($this->patient_guarantees_count, $this->patient_assistances_count),
                fn () => $this->patient_guarantees_count + $this->patient_assistances_count,
            ),
            'his_amount' => $this->when(
                isset($this->his_amount),
                fn () => $this->his_amount !== null ? (float) $this->his_amount : null
            ),
            'gl_posted' => $this->when(isset($this->gl_posted), fn () => (bool) $this->gl_posted),
            'gl_post_date' => $this->when(isset($this->gl_post_date), fn () => $this->gl_post_date),
            'has_breakdown' => $this->when(isset($this->has_breakdown), fn () => (bool) $this->has_breakdown),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
