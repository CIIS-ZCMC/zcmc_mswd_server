<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreServiceVisitRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Time a patient in for one HIS encounter. The arrival stamp and the receiving
     * worker always come from the server, never from the body.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'his_transaction_id' => ['required', 'integer', 'min:1'],
            'purpose' => ['nullable', 'string', 'max:120'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ];
    }
}
