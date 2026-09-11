<?php

namespace Database\Seeders;

use App\Models\CaseModel;
use App\Models\Patient;
use App\Models\PatientCaretaker;
use App\Models\PatientFamilyMember;
use App\Models\PatientWatcher;
use App\Models\Sector;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;

/**
 * Five sample patients with custody, family, watchers and one open case each —
 * enough to exercise the Caretake tab, the handover chain and the audit trail
 * end to end.
 *
 * Called from DatabaseSeeder, so `migrate:fresh --seed` produces a usable
 * local dataset. It is demonstration data with invented names and addresses,
 * and `run()` refuses to execute in production for that reason. It can also be
 * run on its own:
 *
 *     php artisan db:seed --class=SamplePatientSeeder
 *
 * Idempotent — every row is keyed on a natural identifier, so re-running adds
 * nothing and cannot trip the `uniq_active_patient_caretaker` index.
 *
 * The caretaker rows are deliberately varied rather than uniform, because the
 * tab's interesting states are the non-default ones:
 *
 *   - patient 2 carries a full handover: an ended row whose `replaced_by_id`
 *     points at the live one, which is the only shape that renders as a chain
 *   - patient 4 carries a plain unassignment, ended with a reason and no
 *     replacement — the case that must *not* render as a chain
 *   - patient 5 has a single caretaker and no family, so the empty states get
 *     exercised too
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

        // The staff below are assigned real roles, which must exist first.
        // RolesAndPermissionsSeeder is idempotent (findOrCreate throughout), so
        // calling it here is safe whether or not it has already run.
        $this->call(RolesAndPermissionsSeeder::class);

        $sectors = $this->seedSectors();
        $staff = $this->seedStaff();

        foreach ($this->patients() as $definition) {
            $this->seedPatient($definition, $sectors, $staff);
        }

        Auth::forgetUser();
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
     * Staff who hold and grant custody. Real users matter here beyond cosmetics:
     * the caretaker picker reads `GET /users`, and `assigned_by` /
     * `unassigned_by` are FKs that must resolve to a row for the Caretake tab to
     * show who acted.
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
                'caretakers' => [
                    ['user' => 'santos', 'role' => 'social_worker', 'assigned_by' => 'maguyon', 'months_ago' => 3, 'reason' => 'Primary handling social worker for the cardiac assistance request.'],
                    ['user' => 'torres', 'role' => 'nurse', 'assigned_by' => 'maguyon', 'months_ago' => 2, 'reason' => 'Ward coordination for post-procedure monitoring.'],
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
                /**
                 * The handover case. `replaced_by` names the key of the row
                 * that supersedes this one; seedCaretakers resolves it to an id
                 * after both rows exist.
                 */
                'caretakers' => [
                    ['key' => 'outgoing', 'user' => 'santos', 'role' => 'social_worker', 'assigned_by' => 'maguyon', 'months_ago' => 6, 'reason' => 'Initial custody on admission for dialysis assistance.', 'ended_months_ago' => 2, 'unassigned_by' => 'maguyon', 'unassigned_reason' => 'Caseload rebalancing — transferred to the renal team focal person.', 'replaced_by' => 'incoming'],
                    ['key' => 'incoming', 'user' => 'villaflor', 'role' => 'social_worker', 'assigned_by' => 'maguyon', 'months_ago' => 2, 'reason' => 'Accepted handover as renal team focal person.'],
                    ['user' => 'torres', 'role' => 'case_manager', 'assigned_by' => 'maguyon', 'months_ago' => 5, 'reason' => 'Coordinates the PhilHealth and MAIFIP filings.'],
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
                'caretakers' => [
                    ['user' => 'torres', 'role' => 'social_worker', 'assigned_by' => 'santos', 'months_ago' => 4, 'reason' => 'Assigned at intake for the dialysis subsidy workup.'],
                    ['user' => 'maguyon', 'role' => 'counselor', 'assigned_by' => 'santos', 'months_ago' => 1, 'reason' => 'Psychosocial support during treatment adjustment.'],
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
                /**
                 * A plain unassignment — ended with a reason and no successor.
                 * Must render as a closed assignment, never as a handover chain.
                 */
                'caretakers' => [
                    ['user' => 'santos', 'role' => 'social_worker', 'assigned_by' => 'maguyon', 'months_ago' => 2, 'reason' => 'Senior citizen assistance filing.'],
                    ['user' => 'torres', 'role' => 'nurse', 'assigned_by' => 'maguyon', 'months_ago' => 5, 'reason' => 'Temporary ward coverage during confinement.', 'ended_months_ago' => 3, 'unassigned_by' => 'santos', 'unassigned_reason' => 'Patient discharged; ward coverage no longer required.'],
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
                // Intentionally sparse: no family, no watchers, one caretaker —
                // this is the record that exercises the tabs' empty states.
                'family' => [],
                'watchers' => [],
                'caretakers' => [
                    ['user' => 'villaflor', 'role' => 'social_worker', 'assigned_by' => 'santos', 'months_ago' => 1, 'reason' => 'Maternal care assistance intake.'],
                ],
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
        $this->seedCaretakers($patient, $definition['caretakers'], $staff);
    }

    /**
     * One open episode per patient. The Caretake tab contrasts this case's
     * `assigned_user` — the episode handler — against standing custody, so the
     * distinction is invisible without a case to point at.
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
                $watcher + ['address' => $patient->address],
            );
        }
    }

    /**
     * Two passes, because `replaced_by_id` is a self-referencing FK: every row
     * has to exist before the chain can be stitched. Writing it in one pass
     * would mean ordering the array so successors always come first, which is
     * a constraint on the data rather than on the code.
     *
     * @param  list<array<string, mixed>>  $assignments
     * @param  array<string, User>  $staff
     */
    private function seedCaretakers(Patient $patient, array $assignments, array $staff): void
    {
        /** @var array<string, PatientCaretaker> $byKey */
        $byKey = [];

        foreach ($assignments as $assignment) {
            $isEnded = isset($assignment['ended_months_ago']);
            $assignedDate = Carbon::now()->subMonths($assignment['months_ago']);

            // Keyed on patient+user+role only. `assigned_date` is relative to
            // now and so differs on every run — including it would match
            // nothing the second time, insert a duplicate, and collide with
            // uniq_active_patient_caretaker. No two sample assignments share
            // this triple.
            $caretaker = PatientCaretaker::firstOrCreate(
                [
                    'patient_id' => $patient->id,
                    'user_id' => $staff[$assignment['user']]->id,
                    'role' => $assignment['role'],
                ],
                [
                    'assigned_date' => $assignedDate,
                    'assigned_by' => $staff[$assignment['assigned_by']]->id,
                    'reason' => $assignment['reason'],
                    // is_active and unassigned_date must agree: the migration
                    // that added the unique guard treats a disagreement as
                    // drift and repairs it by trusting the date.
                    'is_active' => ! $isEnded,
                    'unassigned_date' => $isEnded ? Carbon::now()->subMonths($assignment['ended_months_ago']) : null,
                    'unassigned_by' => $isEnded ? $staff[$assignment['unassigned_by']]->id : null,
                    'unassigned_reason' => $isEnded ? $assignment['unassigned_reason'] : null,
                ],
            );

            if (isset($assignment['key'])) {
                $byKey[$assignment['key']] = $caretaker;
            }
        }

        foreach ($assignments as $assignment) {
            if (! isset($assignment['key'], $assignment['replaced_by'])) {
                continue;
            }

            $byKey[$assignment['key']]->update([
                'replaced_by_id' => $byKey[$assignment['replaced_by']]->id,
            ]);
        }
    }
}
