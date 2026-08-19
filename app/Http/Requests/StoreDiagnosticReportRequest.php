<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreDiagnosticReportRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.update') ?? false;
    }

    /**
     * The file is stored and `diagnostic_id`/`uploaded_by`/`file_*` are set server-side.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'report_type' => ['required', 'string', 'max:255'],
            'file' => ['required', 'file', 'max:10240'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
