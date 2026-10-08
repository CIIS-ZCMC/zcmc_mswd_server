<?php

namespace App\Http\Requests;

use App\Models\Signatory;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSignatoryRequest extends FormRequest
{
    /** Permission is enforced by the controller's middleware. */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'name' => ['required', 'string', 'max:255'],
            'title' => ['nullable', 'string', 'max:1000'],
            'role' => ['required', 'string', Rule::in(array_keys(Signatory::ROLES))],
            'is_active' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ];
    }

    /**
     * A printable reads one officer per role, so a role has at most one active
     * signatory. Deactivate the outgoing officer before activating the new one.
     *
     * @return array<int, callable>
     */
    public function after(): array
    {
        return [
            function (Validator $validator) {
                if ($validator->errors()->isNotEmpty()) {
                    return;
                }

                /** @var Signatory|null $current */
                $current = $this->route('signatory');
                $role = $this->input('role', $current?->role);
                $active = $this->has('is_active') ? $this->boolean('is_active') : ($current?->is_active ?? true);

                if (! $active) {
                    return;
                }

                $taken = Signatory::query()
                    ->where('role', $role)
                    ->where('is_active', true)
                    ->when($current, fn ($query) => $query->whereKeyNot($current->getKey()))
                    ->exists();

                if ($taken) {
                    $validator->errors()->add(
                        'is_active',
                        'Another signatory is already active for this role. Deactivate them first.',
                    );
                }
            },
        ];
    }
}
