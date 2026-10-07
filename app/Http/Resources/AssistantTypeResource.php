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
            // Usage, when counted: assistance records plus guarantee breakdown lines.
            'usage_count' => $this->when(
                isset($this->patient_assistances_count, $this->guarantee_items_count),
                fn () => (int) $this->patient_assistances_count + (int) $this->guarantee_items_count,
            ),
            'usage' => $this->when(isset($this->patient_assistances_count, $this->guarantee_items_count), fn () => [
                'assistance_records' => (int) $this->patient_assistances_count,
                'guarantee_lines' => (int) $this->guarantee_items_count,
            ]),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
