<?php

use App\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Database\Migrations\Migration;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

/**
 * Gives Processor and Case Manager full CRUD on their own modules (Patients, and
 * Cases for the Case Manager). Existing roles are matched by code and only gain
 * permissions, so edits made to them since seeding are kept. On a fresh database
 * no roles exist yet and the seeder grants them.
 */
return new class extends Migration
{
    /**
     * The permissions each role gains, keyed by role code.
     *
     * @var array<string, list<string>>
     */
    private const GRANTS = [
        'processor' => [
            'patients.create', 'patients.update', 'patients.delete',
            'socioeconomic.create', 'socioeconomic.update', 'socioeconomic.delete',
            'guarantee.create', 'guarantee.update', 'guarantee.delete',
        ],
        'case_manager' => [
            'patients.create', 'patients.update', 'patients.delete',
            'socioeconomic.delete',
            'guarantee.delete',
            'cases.delete',
        ],
    ];

    public function up(): void
    {
        $this->eachRole(function (Role $role, array $permissions) {
            $guard = RolesAndPermissionsSeeder::GUARD;

            $role->givePermissionTo(array_map(
                fn (string $permission) => Permission::findOrCreate($permission, $guard),
                $permissions,
            ));
        });
    }

    public function down(): void
    {
        $this->eachRole(function (Role $role, array $permissions) {
            $role->revokePermissionTo($permissions);
        });
    }

    /**
     * @param  callable(Role, list<string>): void  $callback
     */
    private function eachRole(callable $callback): void
    {
        $registrar = app(PermissionRegistrar::class);
        $registrar->forgetCachedPermissions();

        Role::query()
            ->whereIn('code', array_keys(self::GRANTS))
            ->where('guard_name', RolesAndPermissionsSeeder::GUARD)
            ->get()
            ->each(fn (Role $role) => $callback($role, self::GRANTS[$role->code]));

        $registrar->forgetCachedPermissions();
    }
};
