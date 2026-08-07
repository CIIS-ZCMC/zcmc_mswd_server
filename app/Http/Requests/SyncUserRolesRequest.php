<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SyncUserRolesRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('users.manage') ?? false;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $rolesTable = config('permission.table_names.roles');

        return [
            'roles' => ['required', 'array'],
            'roles.*' => ['string', Rule::exists($rolesTable, 'name')],
        ];
    }
}
