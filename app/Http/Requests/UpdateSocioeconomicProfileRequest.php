<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional, plus `refresh_income`: re-read the patient's and
 * family members' income into the record's snapshot (otherwise the snapshot is kept).
 */
class UpdateSocioeconomicProfileRequest extends StoreSocioeconomicProfileRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = parent::rules();
        $rules['recorded_on'] = ['sometimes', 'date', 'before_or_equal:today'];
        $rules['refresh_income'] = ['sometimes', 'boolean'];

        return $rules;
    }
}
