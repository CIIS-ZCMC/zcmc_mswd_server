<?php

namespace Database\Seeders;

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientFamilyMember;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Seeder;
use Illuminate\Events\NullDispatcher;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Five sample patients with family, watchers and one open case each —
 * enough to exercise the profile tabs and the audit trail end to end.
 *
 * Called from DatabaseSeeder, so `migrate:fresh --seed` produces a usable
 * local dataset. It is demonstration data with invented names and addresses,
 * and `run()` refuses to execute in production for that reason. It can also be
 * run on its own:
 *
 *     php artisan db:seed --class=SamplePatientSeeder
 *
 * Idempotent — every row is keyed on a natural identifier, so re-running adds
 * nothing. Patient 5 has no family and no watchers, so the empty states get
 * exercised too.
 */
class SamplePatientSeeder extends Seeder
{
    /**
     * Deliberately NOT using WithoutModelEvents: the Auditable trait firing on
     * these inserts is the point. It is what gives the History tab and the
     * global audit log something real to render.
     *
     * Each block runs as an authenticated actor so those entries carry a
     * causer — spatie resolves it from the active guard, and rows seeded with
     * no one logged in would all read "System".
     */
    public function run(): void
    {
        // This seeder is wired into DatabaseSeeder, so it runs on any
        // `migrate:fresh --seed`. Artisan prompts before seeding production,
        // but `--force` in a deploy script skips that prompt — and inventing
        // five patients in a live hospital database is not a mistake that can
        // be quietly undone. Refuse rather than rely on the caller.
        if (app()->isProduction()) {
            $this->command?->warn('SamplePatientSeeder skipped: demonstration data, not for production.');

            return;
        }

        // DatabaseSeeder uses WithoutModelEvents, which mutes events for every
        // seeder it calls — this one included. That would silently defeat the
        // whole point: Auditable would never fire, and the History tab and the
        // audit log would come up empty on a freshly seeded database.
        //
        // Model::withoutEvents() mutes by swapping in a NullDispatcher, not by
        // nulling the dispatcher, so that wrapper is what to look for. Swap the
        // real one back for the duration and restore the wrapper after;
        // withoutEvents() also restores its own captured dispatcher in a
        // finally block, so nothing leaks into the rest of the run either way.
        $mutedDispatcher = Model::getEventDispatcher();
        $eventsWereMuted = $mutedDispatcher instanceof NullDispatcher;

        if ($eventsWereMuted) {
            Model::setEventDispatcher(app('events'));
        }

        try {
            // The staff below are assigned real roles, which must exist first.
            // RolesAndPermissionsSeeder is idempotent (findOrCreate throughout),
            // so calling it here is safe whether or not it has already run.
            $this->call(RolesAndPermissionsSeeder::class);

            $sectors = $this->seedSectors();
            $staff = $this->seedStaff();

            foreach ($this->patients() as $definition) {
                $this->seedPatient($definition, $sectors, $staff);
            }
        } finally {
            Auth::forgetUser();

            if ($eventsWereMuted) {
                Model::setEventDispatcher($mutedDispatcher);
            }
        }
    }

    /**
     * The DSWD sectoral groupings a patient is classified under. `sector_id`
     * is a required FK on patients, so these must exist first.
     *
     * @return array<string, Sector>
     */
    private function seedSectors(): array
    {
        $sectors = [
            'women' => 'Women',
            'children' => 'Children',
            'senior_citizen' => 'Senior Citizen',
            'pwd' => 'Persons with Disability',
            'solo_parent' => 'Solo Parent',
        ];

        $created = [];

        foreach ($sectors as $code => $name) {
            $created[$code] = Sector::firstOrCreate(['code' => $code], ['name' => $name]);
        }

        return $created;
    }

    /**
     * Staff who handle the sample cases. Real users so each case has an
     * `assigned_user` and the audit trail a named causer.
     *
     * @return array<string, User>
     */
    private function seedStaff(): array
    {
        $definitions = [
            'santos' => ['Maria Santos, RSW', 'maria.santos@zcmc.test', 'Supervisor'],
            'torres' => ['Janice Torres, RSW', 'janice.torres@zcmc.test', 'Case Manager'],
            'villaflor' => ['Ramon Villaflor, RSW', 'ramon.villaflor@zcmc.test', 'Case Manager'],
            'maguyon' => ['Elena Mag-uyon, RSW', 'elena.maguyon@zcmc.test', 'MSS Head'],
        ];

        $staff = [];
        $employeeId = 9001;

        foreach ($definitions as $key => [$name, $email, $role]) {
            $user = User::where('email', $email)->first();

            if (! $user) {
                $user = User::factory()->create([
                    'employee_id' => $employeeId,
                    'employee_number' => 2026000000 + $employeeId,
                    'employee_name' => $name,
                    'email' => $email,
                    'role' => 'staff',
                ]);
            }

            $user->syncRoles([$role]);
            $user->syncRoleCache();

            $staff[$key] = $user;
            $employeeId++;
        }

        return $staff;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function patients(): array
    {
        return [
            [
                'key' => 'delacruz',
                'sector' => 'women',
                'hospital_id' => 20260008912,
                'mswd_id' => 20260000412,
                'patient' => [
                    'first_name' => 'Juanita',
                    'middle_name' => 'Dela Cruz',
                    'last_name' => 'San Juan',
                    'birthdate' => '1978-03-14',
                    'sex' => 'Female',
                    'civil_status' => 'Married',
                    'address' => '12 Sampaguita St., Tetuan',
                    'barangay' => 'Tetuan',
                    'municipality' => 'Zamboanga City',
                    'province' => 'Zamboanga del Sur',
                    'contact_number' => '09171234567',
                    'religion' => 'Roman Catholic',
                    'nationality' => 'Filipino',
                    'place_of_birth' => 'Zamboanga City',
                    'educational_attainment' => 'High School Graduate',
                    'occupation' => 'Sari-sari store owner',
                    'monthly_income' => 6500,
                ],
                'case' => ['case_type' => 'Medical Assistance', 'admission_type' => 'Inpatient', 'priority_level' => 'High', 'handler' => 'santos'],
                'family' => [
                    ['name' => 'Ernesto San Juan', 'relationship' => 'Spouse', 'sex' => 'Male', 'age' => 51, 'occupation' => 'Tricycle driver', 'monthly_income' => 8000, 'educational_attainment' => 'High School Graduate', 'is_living_with_patient' => true],
                    ['name' => 'Mark Anthony San Juan', 'relationship' => 'Child', 'sex' => 'Male', 'age' => 16, 'occupation' => 'Student', 'monthly_income' => 0, 'educational_attainment' => 'High School Level', 'is_living_with_patient' => true],
                    ['name' => 'Angel Grace San Juan', 'relationship' => 'Child', 'sex' => 'Female', 'age' => 11, 'occupation' => 'Student', 'monthly_income' => 0, 'educational_attainment' => 'Elementary Level', 'is_living_with_patient' => true],
                ],
                'watchers' => [
                    ['name' => 'Ernesto San Juan', 'relationship' => 'spouse', 'contact_number' => '09181234567', 'is_primary' => true],
                ],
            ],
            [
                'key' => 'mercado',
                'sector' => 'pwd',
                'hospital_id' => 20260009134,
                'mswd_id' => 20260000455,
                'patient' => [
                    'first_name' => 'Rodrigo',
                    'middle_name' => 'Alonzo',
                    'last_name' => 'Mercado',
                    'birthdate' => '1963-07-22',
                    'sex' => 'Male',
                    'civil_status' => 'Widowed',
                    'address' => '88 Rizal Ext., Guiwan',
                    'barangay' => 'Guiwan',
                    'municipality' => 'Zamboanga City',
                    'province' => 'Zamboanga del Sur',
                    'contact_number' => '09209876543',
                    'religion' => 'Roman Catholic',
                    'nationality' => 'Filipino',
                    'place_of_birth' => 'Pagadian City',
                    'educational_attainment' => 'College Level',
                    'occupation' => 'Unemployed',
                    'monthly_income' => 0,
                ],
                'case' => ['case_type' => 'Medical Assistance', 'admission_type' => 'Inpatient', 'priority_level' => 'High', 'handler' => 'villaflor'],
                'family' => [
                    ['name' => 'Liezl Mercado-Fajardo', 'relationship' => 'Child', 'sex' => 'Female', 'age' => 34, 'occupation' => 'Call center agent', 'monthly_income' => 18000, 'educational_attainment' => 'College Graduate', 'is_living_with_patient' => false],
                ],
                'watchers' => [
                    ['name' => 'Liezl Mercado-Fajardo', 'relationship' => 'child', 'contact_number' => '09175558822', 'is_primary' => true],
                ],
            ],
            [
                'key' => 'ong',
                'sector' => 'women',
                'hospital_id' => 20260009288,
                'mswd_id' => 20260000501,
                'patient' => [
                    'first_name' => 'Maricel',
                    'middle_name' => 'Bautista',
                    'last_name' => 'Ong',
                    'birthdate' => '1992-11-04',
                    'sex' => 'Female',
                    'civil_status' => 'Single',
                    'address' => '4 Purok Masagana, Santa Maria',
                    'barangay' => 'Santa Maria',
                    'municipality' => 'Zamboanga City',
                    'province' => 'Zamboanga del Sur',
                    'contact_number' => '09332221144',
                    'religion' => 'Iglesia ni Cristo',
                    'nationality' => 'Filipino',
                    'place_of_birth' => 'Zamboanga City',
                    'educational_attainment' => 'College Graduate',
                    'occupation' => 'Seamstress',
                    'monthly_income' => 9000,
                ],
                'case' => ['case_type' => 'Medical Assistance', 'admission_type' => 'Outpatient', 'priority_level' => 'Medium', 'handler' => 'torres'],
                'family' => [
                    ['name' => 'Corazon Bautista Ong', 'relationship' => 'Parent', 'sex' => 'Female', 'age' => 61, 'occupation' => 'Retired', 'monthly_income' => 3000, 'educational_attainment' => 'High School Graduate', 'is_living_with_patient' => true],
                    ['name' => 'Jomar Bautista Ong', 'relationship' => 'Sibling', 'sex' => 'Male', 'age' => 29, 'occupation' => 'Delivery rider', 'monthly_income' => 14000, 'educational_attainment' => 'Vocational / Technical', 'is_living_with_patient' => true],
                ],
                'watchers' => [
                    ['name' => 'Corazon Bautista Ong', 'relationship' => 'parent', 'contact_number' => '09332221145', 'is_primary' => true],
                    ['name' => 'Jomar Bautista Ong', 'relationship' => 'sibling', 'contact_number' => '09332221146', 'is_primary' => false],
                ],
            ],
            [
                'key' => 'rivera',
                'sector' => 'senior_citizen',
                'hospital_id' => 20260009401,
                'mswd_id' => 20260000577,
                'patient' => [
                    'first_name' => 'Benigno',
                    'middle_name' => 'Salazar',
                    'last_name' => 'Rivera',
                    'birthdate' => '1955-01-30',
                    'sex' => 'Male',
                    'civil_status' => 'Married',
                    'address' => '61 Veterans Ave., Tumaga',
                    'barangay' => 'Tumaga',
                    'municipality' => 'Zamboanga City',
                    'province' => 'Zamboanga del Sur',
                    'contact_number' => '09265553311',
                    'religion' => 'Roman Catholic',
                    'nationality' => 'Filipino',
                    'place_of_birth' => 'Dipolog City',
                    'educational_attainment' => 'College Graduate',
                    'occupation' => 'Retired teacher',
                    'monthly_income' => 12000,
                ],
                'case' => ['case_type' => 'Medical Assistance', 'admission_type' => 'Inpatient', 'priority_level' => 'Medium', 'handler' => 'santos'],
                'family' => [
                    ['name' => 'Remedios Salazar Rivera', 'relationship' => 'Spouse', 'sex' => 'Female', 'age' => 68, 'occupation' => 'Retired', 'monthly_income' => 10000, 'educational_attainment' => 'College Graduate', 'is_living_with_patient' => true],
                ],
                'watchers' => [
                    ['name' => 'Remedios Salazar Rivera', 'relationship' => 'spouse', 'contact_number' => '09265553312', 'is_primary' => true],
                ],
            ],
            [
                'key' => 'amil',
                'sector' => 'women',
                'hospital_id' => 20260009533,
                'mswd_id' => 20260000610,
                'patient' => [
                    'first_name' => 'Aisha',
                    'middle_name' => 'Hadjirul',
                    'last_name' => 'Amil',
                    'birthdate' => '2000-05-19',
                    'sex' => 'Female',
                    'civil_status' => 'Married',
                    'address' => '7 Seaside Rd., Talon-Talon',
                    'barangay' => 'Talon-Talon',
                    'municipality' => 'Zamboanga City',
                    'province' => 'Zamboanga del Sur',
                    'contact_number' => '09384447700',
                    'religion' => 'Islam',
                    'nationality' => 'Filipino',
                    'place_of_birth' => 'Zamboanga City',
                    'educational_attainment' => 'High School Level',
                    'occupation' => 'Housewife',
                    'monthly_income' => 0,
                ],
                'case' => ['case_type' => 'Medical Assistance', 'admission_type' => 'Inpatient', 'priority_level' => 'Low', 'handler' => 'villaflor'],
                // Intentionally sparse: no family, no watchers —
                // this is the record that exercises the tabs' empty states.
                'family' => [],
                'watchers' => [],
            ],
        ];
    }

    /**
     * @param  array<string, mixed>  $definition
     * @param  array<string, Sector>  $sectors
     * @param  array<string, User>  $staff
     */
    private function seedPatient(array $definition, array $sectors, array $staff): void
    {
        $handler = $staff[$definition['case']['handler']];

        // Attribute this patient's whole trail to its episode handler rather
        // than to nobody, so the audit log's "user" column is meaningful.
        Auth::setUser($handler);

        $patient = Patient::firstOrCreate(
            ['mswd_id' => $definition['mswd_id']],
            $definition['patient'] + [
                'sector_id' => $sectors[$definition['sector']]->id,
                'hospital_id' => $definition['hospital_id'],
                'is_incapacitated' => false,
                'permanent_address' => $definition['patient']['address'],
                'present_address' => $definition['patient']['address'],
            ],
        );

        $this->seedCase($patient, $definition, $handler);
        $this->seedFamily($patient, $definition['family']);
        $this->seedWatchers($patient, $definition['watchers']);
    }

    /**
     * One open episode per patient, handled by its `assigned_user`.
     *
     * @param  array<string, mixed>  $definition
     */
    private function seedCase(Patient $patient, array $definition, User $handler): void
    {
        CaseModel::firstOrCreate(
            ['patient_id' => $patient->id, 'case_code' => 'CS-2026-'.$definition['mswd_id'] % 10000],
            [
                'assigned_user_id' => $handler->id,
                'case_type' => $definition['case']['case_type'],
                'is_protective' => false,
                'priority_level' => $definition['case']['priority_level'],
                'status' => 'open',
                'admission_type' => $definition['case']['admission_type'],
                'date_opened' => Carbon::now()->subMonths(3),
            ],
        );
    }

    /**
     * @param  list<array<string, mixed>>  $members
     */
    private function seedFamily(Patient $patient, array $members): void
    {
        foreach ($members as $member) {
            PatientFamilyMember::firstOrCreate(
                ['patient_id' => $patient->id, 'name' => $member['name']],
                $member,
            );
        }
    }

    /**
     * @param  list<array<string, mixed>>  $watchers
     */
    private function seedWatchers(Patient $patient, array $watchers): void
    {
        foreach ($watchers as $watcher) {
            PatientWatcher::firstOrCreate(
                ['patient_id' => $patient->id, 'name' => $watcher['name']],
                [
                    'relationship_code' => $watcher['relationship'],
                    'contact_number' => $watcher['contact_number'] ?? null,
                    'address' => $patient->address,
                ],
            );
        }
    }
}
