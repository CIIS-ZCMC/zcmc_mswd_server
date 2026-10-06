<?php

namespace App\Http\Requests;

use App\Models\AssistanceSource;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StorePatientGuaranteeRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A guarantor on one hospital encounter and its breakdown lines. The total is the
     * sum of the lines and is never taken from the body; `recorded_by` is the
     * signed-in user and `hospital_id` comes from the encounter.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'his_transaction_id' => ['required', 'integer', 'min:1'],
            ...$this->headerRules(),
            ...$this->itemRules(),
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    protected function headerRules(): array
    {
        return [
            'guarantor_id' => ['required', 'integer', Rule::exists('guarantors', 'id')->where('is_active', true)->whereNull('deleted_at')],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'guaranteed_on' => ['required', 'date'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    /**
     * @return array<string, array<mixed>>
     */
    protected function itemRules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.assistance_source_id' => [
                'required', 'integer', 'distinct',
                Rule::exists('assistance_sources', 'id')->where('is_active', true)->whereNull('deleted_at'),
            ],
            'items.*.amount' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'items.*.others_specify' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * A line whose source requires it ("Others") must say what it is.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [function (Validator $validator) {
            $items = $this->input('items');

            if (! is_array($items) || $validator->errors()->hasAny(['items', 'items.*'])) {
                return;
            }

            $needsSpecify = AssistanceSource::query()
                ->whereIn('id', collect($items)->pluck('assistance_source_id')->filter()->all())
                ->where('requires_specify', true)
                ->pluck('id')
                ->all();

            foreach ($items as $index => $item) {
                if (in_array((int) ($item['assistance_source_id'] ?? 0), $needsSpecify, true)
                    && blank($item['others_specify'] ?? null)) {
                    $validator->errors()->add("items.{$index}.others_specify", 'Please specify the source of this assistance.');
                }
            }
        }];
    }
}
