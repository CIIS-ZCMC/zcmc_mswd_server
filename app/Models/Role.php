<?php

namespace App\Models;

use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Support\Str;
use Spatie\Permission\Models\Role as SpatieRole;

/**
 * A role has a display `name` (free to rename) and a stable `code` (e.g. `case_manager`)
 * that the code and the IAM `roles` claim match on.
 */
class Role extends SpatieRole
{
    use HasFactory;

    protected static function booted(): void
    {
        // Callers that create a role by name alone still get a unique code.
        static::creating(function (Role $role): void {
            if (blank($role->code)) {
                $role->code = self::uniqueCodeFor($role->name, $role->guard_name);
            }
        });
    }

    /**
     * The name in snake case, numbered when another role already holds it.
     */
    public static function uniqueCodeFor(string $name, ?string $guard = null): string
    {
        $base = Str::snake($name) ?: 'role';
        $code = $base;

        for ($n = 2; static::query()->where('code', $code)->where('guard_name', $guard ?? RolesAndPermissionsSeeder::GUARD)->exists(); $n++) {
            $code = $base.'_'.$n;
        }

        return $code;
    }

    /**
     * Core roles are defined in code (the seeder) and back the app's defaults.
     */
    public function isCore(): bool
    {
        return in_array($this->code, RolesAndPermissionsSeeder::ROLE_CODES, true);
    }

    public function isSuperAdmin(): bool
    {
        return $this->code === RolesAndPermissionsSeeder::SUPER_ADMIN_CODE;
    }
}
