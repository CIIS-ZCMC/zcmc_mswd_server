<?php

namespace App\Providers;

use App\Models\Role;
use Database\Seeders\RolesAndPermissionsSeeder;
use Illuminate\Support\ServiceProvider;
use RuntimeException;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Hard guard: the super-admin role can never be deleted, from any
        // surface (panel, API, tinker). The RoleService enforces this for the
        // HTTP layer; this model event covers every other path.
        Role::deleting(function (Role $role): void {
            if ($role->name === RolesAndPermissionsSeeder::SUPER_ADMIN) {
                throw new RuntimeException('The super administrator role cannot be deleted.');
            }
        });
    }
}
