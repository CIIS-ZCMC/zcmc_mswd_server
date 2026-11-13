<?php

namespace App\Http\Requests;

use App\Support\PsgcAddress;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreGuarantorRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * A guarantor. The name is unique among guarantors that are not deleted, so a
     * deleted guarantor's name can be used again.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255', Rule::unique('guarantors', 'name')->ignore($this->route('guarantor'))->whereNull('deleted_at')],
            // Picked from PSGC; the controller writes the composed `address`.
            ...PsgcAddress::rules('address'),
            'is_active' => ['sometimes', 'boolean'],
        ];
    }
}
