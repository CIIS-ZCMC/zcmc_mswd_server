<?php

namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\PermissionRegistrar;

class RolesAndPermissionsSeeder extends Seeder
{
    /**
     * The all-powerful role. Protected from rename/deletion everywhere.
     */
    public const SUPER_ADMIN = 'Super Admin';

    /**
     * The super admin's stable code. Match on this, not the display name.
     */
    public const SUPER_ADMIN_CODE = 'super_admin';

    /**
     * Each default role's stable system code. Core roles are the ones listed here.
     *
     * @var array<string, string>
     */
    public const ROLE_CODES = [
        'Super Admin' => 'super_admin',
        'Admin' => 'admin',
        'Head' => 'head',
        'Supervisor' => 'supervisor',
        'Case Manager' => 'case_manager',
        'Processor' => 'processor',
    ];

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
     * Sub-records fold into their parent (patient ids/watchers/family
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
        'patients.merge',
        // Import a HIS patient into the registry (the header's Search or Import Patient).
        // Apart from patients.create so a read-only role can import without manual entry.
        'patients.import',
        // Hospital (HIS) patients — read-only browse of the emdPatients master
        'hospital-patients.view',
        // Cases
        'cases.view',
        'cases.create',
        'cases.update',
        'cases.delete',
        'cases.waive_watcher',
        'cases.finalize_social_case',
        // Patient assistance
        'assistance.view',
        'assistance.create',
        'assistance.update',
        'assistance.approve',
        // Unified Intake Sheet (ANNEX B) — a printable, not a record: this one
        // permission guards printing it and reading its print history.
        'intake.view',
        // Socio-Economic profile (patient-level; independent of cases and the UIS)
        'socioeconomic.view',
        'socioeconomic.create',
        'socioeconomic.update',
        'socioeconomic.delete',
        // Patient guarantors per hospital encounter, with their assistance breakdown
        'guarantee.view',
        'guarantee.create',
        'guarantee.update',
        'guarantee.delete',
        // Audit trail
        'audit.view',
        'audit.view_protective',
        // Reports
        'reports.view',
        'reports.generate',
        // Daily Accomplishment Report: a worker's own log of patients served
        'dar.manage',
        // Turnaround time: timing patients in, starting and completing their service
        'queue.manage',
        // Reference / lookup data
        'settings.manage',
        // In-app Library: modes of assistance and fund sources offered on the UIS
        'library.manage',
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
        // The superuser: every permission, plus the Gate::before bypass. The only role
        // that opens the /admin panel and manages users and roles.
        'Super Admin' => ['*'],
        // Every module of the client app, but none of the /admin panel (panel.access,
        // users.manage, roles.manage, settings.manage).
        'Admin' => [
            'patients.view', 'patients.create', 'patients.update', 'patients.delete', 'patients.merge', 'patients.import', 'hospital-patients.view',
            'cases.view', 'cases.create', 'cases.update', 'cases.delete', 'cases.waive_watcher', 'cases.finalize_social_case',
            'assistance.view', 'assistance.create', 'assistance.update', 'assistance.approve',
            'intake.view',
            'socioeconomic.view', 'socioeconomic.create', 'socioeconomic.update', 'socioeconomic.delete',
            'guarantee.view', 'guarantee.create', 'guarantee.update', 'guarantee.delete',
            'audit.view', 'audit.view_protective',
            'reports.view', 'reports.generate',
            'dar.manage', 'queue.manage',
            'library.manage',
            'users.view',
        ],
        // Per-module roles: each one holds only its modules. Library, Audit, users/roles
        // and the /admin panel stay with Admin and Super Admin.
        'Head' => [
            'reports.view', 'reports.generate',
            // Sign-off authority
            'assistance.approve', 'cases.finalize_social_case', 'cases.waive_watcher',
        ],
        'Supervisor' => [
            // Patients
            'patients.view', 'patients.create', 'patients.update', 'patients.merge', 'patients.import', 'hospital-patients.view',
            'intake.view',
            'socioeconomic.view', 'socioeconomic.create', 'socioeconomic.update',
            'guarantee.view', 'guarantee.create', 'guarantee.update',
            // Queue, DAR, Reports
            'queue.manage',
            'dar.manage',
            'reports.view', 'reports.generate',
            // Sign-off authority
            'assistance.approve', 'cases.finalize_social_case', 'cases.waive_watcher',
        ],
        'Case Manager' => [
            // Patients: read-only lookups the case work depends on, plus HIS import
            'patients.view', 'patients.import', 'hospital-patients.view',
            // Cases
            'cases.view', 'cases.create', 'cases.update',
            'assistance.view', 'assistance.create', 'assistance.update',
            'intake.view',
            'socioeconomic.view', 'socioeconomic.create', 'socioeconomic.update',
            'guarantee.view', 'guarantee.create', 'guarantee.update',
            // Queue, DAR
            'queue.manage',
            'dar.manage',
        ],
        'Processor' => [
            // Patients
            'patients.view', 'patients.import', 'hospital-patients.view',
            'intake.view',
            'socioeconomic.view',
            'guarantee.view',
            // Queue, DAR
            'queue.manage',
            'dar.manage',
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
                // The code is passed explicitly: with model events suppressed the Role
                // model's creating hook, which fills a missing code, does not run.
                $role = Role::firstOrCreate(
                    ['name' => $roleName, 'guard_name' => $guard],
                    ['code' => self::ROLE_CODES[$roleName]],
                );

                if ($role->code !== self::ROLE_CODES[$roleName]) {
                    $role->forceFill(['code' => self::ROLE_CODES[$roleName]])->save();
                }

                $grant = $permissions === ['*'] ? self::PERMISSIONS : $permissions;

                $role->syncPermissions($grant);
            }
        });

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }
}
