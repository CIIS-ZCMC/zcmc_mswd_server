<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StorePermissionRequest extends FormRequest
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
        $permissionsTable = config('permission.table_names.permissions');

        return [
            'name' => ['required', 'string', 'max:255', Rule::unique($permissionsTable, 'name')],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
