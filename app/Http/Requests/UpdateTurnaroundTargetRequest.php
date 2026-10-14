<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateTurnaroundTargetRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'minutes' => ['sometimes', 'required', 'integer', 'min:1', 'max:1440'],
            'is_active' => ['sometimes', 'required', 'boolean'],
        ];
    }
}
