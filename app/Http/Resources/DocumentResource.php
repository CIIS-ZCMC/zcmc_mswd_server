<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentResource extends JsonResource
{
    /**
     * Transform the resource into an array. The storage path is not exposed: the file
     * is read through `file_url`, which checks permission.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'case_id' => $this->case_id,
            'patient_id' => $this->patient_id,
            'intervention_id' => $this->intervention_id,
            'uploaded_by' => $this->uploaded_by,
            'uploaded_by_name' => $this->whenLoaded('uploadedBy', fn () => $this->uploadedBy?->name),
            'case_code' => $this->whenLoaded('case', fn () => $this->case?->case_code),
            'document_type_id' => $this->document_type_id,
            // The Library type's name when loaded; older rows and the social case study
            // PDFs keep a code in the column.
            'document_type' => $this->whenLoaded('documentType', fn () => $this->documentType?->name ?? $this->document_type, $this->document_type),
            'file_name' => $this->file_name,
            'file_type' => $this->file_type,
            'file_size' => $this->file_size,
            'file_url' => route('patients.documents.file', [
                'patient' => $this->patient_id,
                'document' => $this->id,
            ], false),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
