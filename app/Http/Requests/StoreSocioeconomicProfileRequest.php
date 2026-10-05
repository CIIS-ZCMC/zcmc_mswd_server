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
     * `recorded_by` and `household_size` are never taken from the body: the first is
     * the signed-in user, the second is the household at record time.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'recorded_on' => ['required', 'date', 'before_or_equal:today'],
            'total_family_income' => ['nullable', 'numeric', 'min:0'],
            'other_income_sources' => ['nullable', 'array'],
            'other_income_sources.*.source' => ['required', 'string', 'max:255'],
            'other_income_sources.*.amount' => ['nullable', 'numeric', 'min:0'],
            'house_tenure' => ['nullable', 'string', Rule::in(SocioeconomicVocabulary::HOUSE_TENURES)],
            'housing_type' => ['nullable', 'string', 'max:255'],
            'light_source' => ['nullable', 'array'],
            'light_source.*' => ['string', Rule::in(SocioeconomicVocabulary::LIGHT_SOURCES)],
            'water_source' => ['nullable', 'array'],
            'water_source.*' => ['string', Rule::in(SocioeconomicVocabulary::WATER_SOURCES)],
            'utilities_access' => ['nullable', 'string', 'max:255'],
            'remarks' => ['nullable', 'string'],
            'expenses' => ['nullable', 'array'],
            'expenses.*.expense_type' => ['required', 'string', 'max:255'],
            'expenses.*.amount' => ['required', 'numeric', 'min:0'],
        ];
    }
}
