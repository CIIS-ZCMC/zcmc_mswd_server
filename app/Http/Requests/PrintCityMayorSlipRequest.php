<?php

namespace App\Http\Requests;

use App\Services\CityMayorSlipPdfService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query options of GET /api/patient-transactions/{id}/city-mayor-slip/pdf. The
 * fund, amount and "para sa" types are picked in the print dialog and printed
 * only (not stored).
 */
class PrintCityMayorSlipRequest extends FormRequest
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
            // The "Para sa" ticks: sent comma-separated, split in prepareForValidation().
            'assistant_type_ids' => ['sometimes', 'array', 'max:20'],
            'assistant_type_ids.*' => ['integer', 'distinct', 'exists:assistant_types,id'],
            'fund' => ['sometimes', 'nullable', Rule::in(array_keys(CityMayorSlipPdfService::FUNDS))],
            'fund_other' => ['nullable', 'required_if:fund,others', 'string', 'max:100'],
            'amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            'time_started' => ['sometimes', 'nullable', 'date_format:H:i'],
            'time_ended' => ['sometimes', 'nullable', 'date_format:H:i'],
        ];
    }
}
