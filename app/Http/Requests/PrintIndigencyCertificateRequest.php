<?php

namespace App\Http\Requests;

use App\Services\IndigencyCertificatePdfService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query options of GET /api/patient-transactions/{id}/indigency-certificate/pdf.
 * The classification and services availed are picked in the print dialog and
 * printed only (not stored).
 */
class PrintIndigencyCertificateRequest extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if (is_string($this->input('assistant_type_ids'))) {
            $this->merge([
                'assistant_type_ids' => array_values(array_filter(
                    explode(',', $this->input('assistant_type_ids')),
                    fn ($id) => $id !== '',
                )),
            ]);
        }
    }

    public function authorize(): bool
    {
        return $this->user()?->can('guarantee.view') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'preview' => ['sometimes', 'boolean'],
            'download' => ['sometimes', 'boolean'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:255'],
            // The services availed: sent comma-separated, split in prepareForValidation().
            'assistant_type_ids' => ['sometimes', 'array', 'max:20'],
            'assistant_type_ids.*' => ['integer', 'distinct', 'exists:assistant_types,id'],
            'classification' => ['sometimes', 'nullable', Rule::in(array_keys(IndigencyCertificatePdfService::CLASSIFICATIONS))],
        ];
    }
}
