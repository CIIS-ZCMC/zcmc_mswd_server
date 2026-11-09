<?php

namespace App\Support;

use App\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;

/**
 * Turns role values sent by an outside sign-in (IAM, UMIS) into local role
 * names. A value matches a local role by its system code (`case_manager`)
 * first, then by name; the role map can rename a value before matching.
 * Values with no local role are dropped rather than created, and an outside
 * sign-in can never grant the super admin role: that one is held only by
 * local password accounts.
 */
class ExternalRoleMatcher
{
    /**
     * @param  array<int, string>  $values
     * @param  array<string, string>  $roleMap  outside value => local code or name
     * @return array<int, string> local role names
     */
    public static function match(array $values, array $roleMap = []): array
    {
        $local = Role::query()
            ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
            ->where('code', '!=', RolesAndPermissionsSeeder::SUPER_ADMIN_CODE)
            ->get(['name', 'code']);

        $names = [];

        foreach ($values as $value) {
            $value = $roleMap[$value] ?? $value;
            $match = $local->firstWhere('code', $value) ?? $local->firstWhere('name', $value);

            if ($match !== null) {
                $names[] = $match->name;
            }
        }

        return array_values(array_unique($names));
    }
}
