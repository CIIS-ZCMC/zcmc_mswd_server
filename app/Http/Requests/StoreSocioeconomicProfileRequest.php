<?php

namespace App\Http\Requests;

use App\Support\SocioeconomicVocabulary;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreSocioeconomicProfileRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * The List of Expenses form (ANNEX B section III). `recorded_by` is never taken
     * from the body — it is the signed-in user. `house_rent_amount` is dropped by the
     * service unless the house is rented.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $amount = ['nullable', 'numeric', 'min:0'];

        return [
            'recorded_on' => ['required', 'date', 'before_or_equal:today'],
            'house_tenure' => ['nullable', 'string', Rule::in(SocioeconomicVocabulary::HOUSE_TENURES)],
            'house_rent_amount' => $amount,
            'light_source' => ['nullable', 'array'],
            'light_source.*' => ['string', Rule::in(SocioeconomicVocabulary::LIGHT_SOURCES)],
            'water_source' => ['nullable', 'array'],
            'water_source.*' => ['string', Rule::in(SocioeconomicVocabulary::WATER_SOURCES)],
            'food' => $amount,
            'transport' => $amount,
            'medical' => $amount,
            'insurance' => $amount,
            'education' => $amount,
            'clothing' => $amount,
            'house_help' => $amount,
            'others' => $amount,
            'others_specify' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
        ];
    }
}
