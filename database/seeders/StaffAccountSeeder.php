<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

/**
 * Dummy front-line staff for development. Under AUTH_PROVIDER=local they
 * sign in at /login with their employee number and the password below.
 */
class StaffAccountSeeder extends Seeder
{
    public const PASSWORD = 'P@$$w0rd';

    /**
     * [employee_id, employee_name, email, role name]
     *
     * @var list<array{int, string, string, string}>
     */
    private const ACCOUNTS = [
        [8001, 'Paolo Reyes', 'processor1@zcmc.test', 'Processor'],
        [8002, 'Liza Domingo', 'processor2@zcmc.test', 'Processor'],
        [8003, 'Carlo Mendoza', 'casemanager1@zcmc.test', 'Case Manager'],
        [8004, 'Grace Alvarez', 'casemanager2@zcmc.test', 'Case Manager'],
        [8005, 'Teresa Ramos', 'supervisor1@zcmc.test', 'Supervisor'],
    ];

    public function run(): void
    {
        $password = Hash::make(self::PASSWORD);

        foreach (self::ACCOUNTS as [$employeeId, $name, $email, $role]) {
            $user = User::firstOrNew(['email' => $email]);

            $user->forceFill([
                'employee_id' => $employeeId,
                'employee_number' => 2026000000 + $employeeId,
                'employee_name' => $name,
                'password' => $password,
                'role' => 'staff',
                'is_active' => true,
                'synced_at' => now(),
            ])->save();

            $user->syncRoles([$role]);
            $user->syncRoleCache();
        }
    }
}
