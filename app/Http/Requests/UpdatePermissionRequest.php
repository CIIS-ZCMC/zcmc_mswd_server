<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdatePermissionRequest extends FormRequest
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
            'name' => [
                'sometimes',
                'string',
                'max:255',
                Rule::unique($permissionsTable, 'name')->ignore($this->route('permission')?->id),
            ],
            'description' => ['nullable', 'string', 'max:255'],
        ];
    }
}
