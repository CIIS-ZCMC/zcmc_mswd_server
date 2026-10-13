<?php

namespace App\Http\Requests;

use App\Services\AcknowledgementSlipPdfService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

/**
 * Query options of the Acknowledgement Slip PDFs: GET /api/guarantees/{guarantee}/
 * acknowledgement-slip/pdf and GET /api/patient-transactions/{id}/acknowledgement-slip/pdf.
 */
class PrintAcknowledgementSlipRequest extends FormRequest
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
            'copies' => ['sometimes', 'integer', 'min:1', 'max:20'],
            'remarks' => ['sometimes', 'nullable', 'string', 'max:255'],
            // The transaction's timing, printed only (not stored).
            'time_started' => ['sometimes', 'nullable', 'date_format:H:i'],
            'time_ended' => ['sometimes', 'nullable', 'date_format:H:i'],
            // The ticked fund box, printed only: DOH-MAIFIP (default), OPAV-SOCIO CIVID FUND or OTHERS.
            'fund' => ['sometimes', 'nullable', Rule::in(array_keys(AcknowledgementSlipPdfService::FUNDS))],
            'fund_other' => ['sometimes', 'nullable', 'string', 'max:100'],
            // Encounter source only: a typed amount, printing without a ledger entry.
            'amount' => ['sometimes', 'nullable', 'numeric', 'min:0', 'max:99999999.99'],
            // HIS source only: the guarantor ledger row (psGntrLedgers.PK_TRXNO).
            'entry' => ['sometimes', 'nullable', 'integer'],
            // HIS source only: the "para sa" types (HIS records none), picked in the
            // print dialog. Sent comma-separated; split in prepareForValidation().
            'assistant_type_ids' => ['sometimes', 'array', 'max:10'],
            'assistant_type_ids.*' => ['integer', 'distinct', 'exists:assistant_types,id'],
        ];
    }
}
