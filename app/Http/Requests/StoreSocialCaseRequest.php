<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreSocialCaseRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('cases.create') ?? false;
    }

    /**
     * Every narrative field is optional at start — the report is written over
     * days, not typed in one sitting. `assessment_id` picks which of the case's
     * assessments to promote; omitted, the latest is used.
     *
     * `classification` is only reachable as a requirement inside the service,
     * where it applies solely to a case that has no assessment to promote.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'assessment_id' => ['nullable', 'integer', 'exists:assessments,id'],
            'classification' => ['nullable', 'string', 'max:255'],
            'total_family_income' => ['nullable', 'numeric', 'min:0'],
            'housing_type' => ['nullable', 'string', 'max:255'],
            'utilities_access' => ['nullable', 'string', 'max:255'],
            'referral_source' => ['nullable', 'string', 'max:255'],
            'reason_for_referral' => ['nullable', 'string'],
            'presenting_problem' => ['nullable', 'string'],
            'family_background' => ['nullable', 'string'],
            'medical_history' => ['nullable', 'string'],
            'social_functioning' => ['nullable', 'string'],
            'assessment_notes' => ['nullable', 'string'],
            'recommendation' => ['nullable', 'string'],
            'recommended_assistance' => ['nullable', 'string', 'max:255'],
            'recommended_amount' => ['nullable', 'numeric', 'min:0'],
            'intervention_plan' => ['nullable', 'string'],
        ];
    }
}
