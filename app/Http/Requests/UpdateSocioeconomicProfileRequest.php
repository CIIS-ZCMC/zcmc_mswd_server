<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;

/**
 * Same fields as a create, all optional. `expenses`, when sent, replaces every line.
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

        return $rules;
    }
}
