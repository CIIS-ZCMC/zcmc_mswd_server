<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call(RolesAndPermissionsSeeder::class);

        // User::factory(10)->create();

        $admin = User::factory()->create([
            'employee_id' => 1,
            'employee_name' => 'Admin University',
            'employee_number' => 2023060551,
            'email' => 'zcmc@admin.com',
            'role' => 'System Administrator',
        ]);

        $admin->assignRole('System Administrator');
        $admin->syncRoleCache();
    }
}
