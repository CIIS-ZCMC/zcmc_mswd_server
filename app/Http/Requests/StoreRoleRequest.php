<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRoleRequest extends FormRequest
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
            'name' => ['required', 'string', 'max:255', Rule::unique($rolesTable, 'name')],
            'description' => ['nullable', 'string', 'max:255'],
            'permissions' => ['sometimes', 'array'],
            'permissions.*' => ['string', Rule::exists($permissionsTable, 'name')],
        ];
    }
}
