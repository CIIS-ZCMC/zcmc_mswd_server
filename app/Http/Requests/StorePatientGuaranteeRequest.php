<?php

namespace App\Http\Requests;

use App\Models\FundSource;
use App\Models\PatientGuarantee;
use App\Rules\SelectableLookupId;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
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
            'guarantor_id' => ['required', 'integer', new SelectableLookupId('guarantors', $this->keptIds('guarantor_id'))],
            'reference_no' => ['nullable', 'string', 'max:255'],
            'guaranteed_on' => ['required', 'date'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    /**
     * A line is Type of Assistance -> Amount -> Mode of Assistance -> Fund Source, one
     * line per type. New choices must be active; an edit may keep what the guarantee
     * already uses.
     *
     * @return array<string, array<mixed>>
     */
    protected function itemRules(): array
    {
        return [
            'items' => ['required', 'array', 'min:1'],
            'items.*.assistant_type_id' => ['required', 'integer', 'distinct', new SelectableLookupId('assistant_types', $this->keptIds('assistant_type_id'))],
            'items.*.amount' => ['required', 'numeric', 'gt:0', 'max:9999999999.99'],
            'items.*.mode_of_assistance_id' => ['required', 'integer', new SelectableLookupId('mode_of_assistances', $this->keptIds('mode_of_assistance_id'))],
            'items.*.fund_source_id' => ['required', 'integer', new SelectableLookupId('fund_sources', $this->keptIds('fund_source_id'))],
            'items.*.others_specify' => ['nullable', 'string', 'max:255'],
        ];
    }

    /**
     * The ids the guarantee being edited already uses in a column (none on create).
     *
     * @return list<int>
     */
    protected function keptIds(string $column): array
    {
        $guarantee = $this->route('guarantee');

        if (! $guarantee instanceof PatientGuarantee) {
            return [];
        }

        if ($column === 'guarantor_id') {
            return [(int) $guarantee->guarantor_id];
        }

        return $guarantee->items()
            ->whereNotNull($column)
            ->pluck($column)
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();
    }

    /**
     * A line whose fund source requires it ("Others") must say what it is.
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

            $needsSpecify = FundSource::withTrashed()
                ->whereIn('id', collect($items)->pluck('fund_source_id')->filter()->all())
                ->where('requires_specify', true)
                ->pluck('id')
                ->all();

            foreach ($items as $index => $item) {
                if (in_array((int) ($item['fund_source_id'] ?? 0), $needsSpecify, true)
                    && blank($item['others_specify'] ?? null)) {
                    $validator->errors()->add("items.{$index}.others_specify", 'Please specify the fund source of this line.');
                }
            }
        }];
    }
}
