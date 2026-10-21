<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/** A document type, as the Library and the upload dropdown read it. */
class DocumentTypeResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'name' => $this->name,
            'is_active' => $this->is_active,
            'sort_order' => $this->sort_order,
            // Loaded withCount('documents'): the uploads filed under this type.
            'usage_count' => $this->whenCounted('documents'),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
