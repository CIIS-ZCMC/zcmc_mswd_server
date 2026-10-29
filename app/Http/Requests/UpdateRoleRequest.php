<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateRoleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('roles.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rolesTable = config('permission.table_names.roles');
        $permissionsTable = config('permission.table_names.permissions');

        return [
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique($rolesTable, 'name')->ignore($this->route('role')?->id),
            ],
            // A role's code is fixed once created; sending it is ignored.
            'code' => ['prohibited'],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists($permissionsTable, 'name')],
        ];
    }
}
