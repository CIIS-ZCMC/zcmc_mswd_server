<?php

namespace App\Http\Resources;

use App\Models\FundSource;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A mode of assistance or fund source, as the Library and the UIS dropdowns read it. */
class AssessmentLookupResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'code' => $this->code,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            // Fund sources only: a breakdown line using it must say what it is ("Others").
            'requires_specify' => $this->when($this->resource instanceof FundSource, fn () => (bool) $this->requires_specify),
            // Usage, when selected withUsageCount(): assessments store the code, breakdown
            // lines the id. Only assessments lock the code.
            'usage_count' => $this->when(isset($this->usage_count), fn () => $this->usage_count),
            'usage' => $this->when(isset($this->usage_count), fn () => [
                'assessments' => (int) $this->assessments_usage,
                'guarantee_lines' => (int) $this->guarantee_lines_usage,
            ]),
            'code_locked' => $this->when(isset($this->usage_count), fn () => (int) $this->assessments_usage > 0),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
