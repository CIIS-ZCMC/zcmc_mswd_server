<?php

namespace App\Http\Resources;

use App\Models\AssistantType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin AssistantType
 */
class AssistantTypeResource extends JsonResource
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
            'code' => $this->code,
            'category' => $this->category,
            'category_label' => AssistantType::categoryOptions($this->category)[$this->category] ?? $this->category,
            'description' => $this->description,
            'is_active' => $this->is_active,
            // Usage, when counted. Guarantee breakdown lines start naming a type with the
            // breakdown rewrite (docs/GUARANTEE_BREAKDOWN_PLAN.md); until then they are 0.
            'usage_count' => $this->whenCounted('patientAssistances'),
            'usage' => $this->whenCounted('patientAssistances', fn () => [
                'assistance_records' => (int) $this->patient_assistances_count,
                'guarantee_lines' => 0,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
