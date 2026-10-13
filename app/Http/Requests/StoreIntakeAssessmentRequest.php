<?php

namespace App\Http\Requests;

/**
 * POST /api/patients/{patient}/intake-assessments: the assessment fields of
 * StoreAssessmentRequest plus the HIS encounter it is for. A new intake is a
 * root assessment, so it takes no parent.
 */
class StoreIntakeAssessmentRequest extends StoreAssessmentRequest
{
    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        unset($rules['parent_assessment_id'], $rules['reassessment_reason']);

        return ['his_transaction_id' => ['required', 'integer', 'min:1']] + $rules;
    }
}
