<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * Query options of GET /api/cases/{case}/uis/pdf.
 */
class PrintUisRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('intake.view') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'preview' => ['sometimes', 'boolean'],
            'download' => ['sometimes', 'boolean'],
            // Print a blank fillable form even though the case has no intake assessment.
            'blank' => ['sometimes', 'boolean'],
            'copies' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:255'],
        ];
    }
}
