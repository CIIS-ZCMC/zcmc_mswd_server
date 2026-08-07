<?php

namespace App\Filament\Resources\Roles\Pages;

use App\Filament\Resources\Roles\RoleResource;
use Database\Seeders\RolesAndPermissionsSeeder;
use Filament\Resources\Pages\CreateRecord;

class CreateRole extends CreateRecord
{
    protected static string $resource = RoleResource::class;

    /**
     * Pin new roles to the canonical guard so permission checks resolve
     * consistently regardless of the request's active guard.
     */
    protected function mutateFormDataBeforeCreate(array $data): array
    {
        $data['guard_name'] = RolesAndPermissionsSeeder::GUARD;

        return $data;
    }
}
