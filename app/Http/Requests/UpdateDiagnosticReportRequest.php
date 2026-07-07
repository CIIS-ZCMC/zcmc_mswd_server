<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateDiagnosticReportRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'uploaded_by' => ['sometimes', 'required', 'exists:users,id'],
            'diagnostic_id' => ['sometimes', 'required', 'exists:diagnostics,id'],
            'report_type' => ['sometimes', 'required', 'string', 'max:255'],
            'file_name' => ['sometimes', 'required', 'string', 'max:255'],
            'file_path' => ['sometimes', 'required', 'string', 'max:255'],
            'file_type' => ['sometimes', 'required', 'string', 'max:255'],
            'remarks' => ['nullable', 'string', 'max:255'],
        ];
    }
}
