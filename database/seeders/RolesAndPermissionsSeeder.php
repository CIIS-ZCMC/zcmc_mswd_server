<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * The all-powerful role. Protected from rename/deletion everywhere.
     */
    public const SUPER_ADMIN = 'Admin';

    /**
     * The guard all RBAC data is stored under.
     *
     * Must be the User model's Eloquent guard (`web`) — NOT the request's
     * active guard. Under token auth the active guard is `sanctum`, which maps
     * to no model, so relying on config('auth.defaults.guard') during an
     * authenticated request would store roles/permissions under an unusable
     * guard. Pinning to `web` keeps every row consistent and resolvable.
     */
    public const GUARD = 'web';

    /**
     * The full permission catalog, grouped by aggregate.
     * Sub-records fold into their parent (patient ids/watchers/family/caretakers
     * → patients; case activities/diagnostics/assessments/interventions/documents
     * → cases; assistance logs → assistance).
     *
     * @var list<string>
     */
    public const PERMISSIONS = [
        // Patients
        'patients.view',
        'patients.create',
        'patients.update',
        'patients.delete',
        // Cases
        'cases.view',
        'cases.create',
        'cases.update',
        'cases.delete',
        // Patient assistance
        'assistance.view',
        'assistance.create',
        'assistance.update',
        'assistance.approve',
        // Unified Intake Sheet
        'intake.view',
        'intake.create',
        'intake.update',
        'intake.finalize',
        'intake.delete',
        // Reports
        'reports.view',
        'reports.generate',
        // Reference / lookup data
        'settings.manage',
        // Access administration
        'users.view',
        'users.manage',
        'roles.manage',
        // Admin panel
        'panel.access',
    ];

    /**
     * Default roles mapped to their permissions.
     * Use ['*'] to grant every permission.
     *
     * @var array<string, list<string>>
     */
    public const ROLES = [
        'Admin' => ['*'],
        'MSS Head' => [
            'patients.view', 'patients.create', 'patients.update', 'patients.delete',
            'cases.view', 'cases.create', 'cases.update', 'cases.delete',
            'assistance.view', 'assistance.create', 'assistance.update', 'assistance.approve',
            'intake.view', 'intake.create', 'intake.update', 'intake.finalize', 'intake.delete',
            'reports.view', 'reports.generate',
            'settings.manage',
            'users.view',
            'panel.access',
        ],
        'Supervisor' => [
            'patients.view', 'patients.create', 'patients.update',
            'cases.view', 'cases.create', 'cases.update', 'cases.delete',
            'assistance.view', 'assistance.create', 'assistance.update', 'assistance.approve',
            'intake.view', 'intake.create', 'intake.update', 'intake.finalize',
            'reports.view', 'reports.generate',
            'panel.access',
        ],
        'Case Manager' => [
            'patients.view', 'patients.create', 'patients.update',
            'cases.view', 'cases.create', 'cases.update',
            'assistance.view', 'assistance.create', 'assistance.update',
            'intake.view', 'intake.create', 'intake.update',
            'reports.view',
        ],
        'Processor' => [
            'patients.view',
            'cases.view',
            'assistance.view', 'assistance.create', 'assistance.update',
            'intake.view', 'intake.create', 'intake.update',
            'reports.view',
        ],
    ];

    public function run(): void
    {
        // Reset the cached roles and permissions before (re)seeding.
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $guard = self::GUARD;

        DB::transaction(function () use ($guard) {
            foreach (self::PERMISSIONS as $permission) {
                Permission::findOrCreate($permission, $guard);
            }

            // Flush the registrar cache after creating permissions so the role
            // sync below reads them fresh. Necessary because DatabaseSeeder runs
            // with WithoutModelEvents, which suppresses the model events Spatie
            // would otherwise use to invalidate this cache.
            app(PermissionRegistrar::class)->forgetCachedPermissions();

            foreach (self::ROLES as $roleName => $permissions) {
                $role = Role::findOrCreate($roleName, $guard);

                $grant = $permissions === ['*'] ? self::PERMISSIONS : $permissions;

                $role->syncPermissions($grant);
            }
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
