# MSWD — Database Migrations

Laravel migrations for the full MSWD schema, in dependency order. Copy each block into its own file under `database/migrations/`, keeping the suggested filename prefixes so Laravel runs them in order (it sorts by the `YYYY_MM_DD_HHMMSS_` timestamp).

**Conventions used here**
- **Enum columns are `string()`**, cast to PHP backed enums in the models (see `ARCHITECTURE.md` §4.4). If you prefer DB-level enforcement, swap `->string('status')` for `->enum('status', [...])` — but note that changing enum values later requires `doctrine/dbal` and a schema change.
- `timestamps()` = the ERD's `timestamp` (Laravel's `created_at`/`updated_at`).
- `softDeletes()` only on editable master data; append-only tables (`*_logs`, `*_reports`, `case_activities`, `diagnostic_reports`) omit it.
- Foreign keys default to `RESTRICT` on delete. Because master tables use soft deletes, parents are never hard-deleted in normal operation, so cascades aren't needed.

---

## Order

```
1  users              (no FKs)
2  sectors            (no FKs)
3  intervention_type  (no FKs)
4  assistant_types    (no FKs)
5  guarantors         (no FKs)
6  patients           → sectors
7  patient_ids        → patients
8  patient_watchers   → patients
9  patient_family_members → patients
10 patient_caretakers → patients, users
11 cases              → patients, users
12 case_activities    → cases, users
13 diagnostics        → cases, users
14 diagnostic_reports → diagnostics, users
15 assessments        → cases, users
16 interventions      → cases, users, intervention_type
17 documents          → cases, patients, interventions, users
18 patient_assistance → cases, assistant_types, guarantors, users
19 patient_assistance_logs    → patient_assistance, users
20 patient_assistance_reports → patient_assistance, users
```

---

## 1 — `users` (UMIS cache)

`0001_01_01_000000_create_users_table.php` — replaces Laravel's default users migration. No password: authentication is handled by UMIS. `id` is the UMIS id, so it does **not** auto-increment.

```php
<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();   // UMIS user id, not auto-increment
            $table->string('displayName');
            $table->string('role');                        // display/filter cache only
            $table->boolean('is_active')->default(true);
            $table->dateTime('synced_at')->nullable();
            $table->timestamps();
        });

        // Optional: keep if you use Laravel sessions alongside UMIS SSO.
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
```

---

## 2 — `sectors`

```php
Schema::create('sectors', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

## 3 — `intervention_type`

```php
Schema::create('intervention_type', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code')->nullable();
    $table->string('description')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

## 4 — `assistant_types`

```php
Schema::create('assistant_types', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('code')->nullable();
    $table->string('category');                 // e.g. medical, food, financial, burial, transportation, others
    $table->string('description')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

## 5 — `guarantors`

```php
Schema::create('guarantors', function (Blueprint $table) {
    $table->id();
    $table->string('name');
    $table->string('address')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

---

## 6 — `patients`

```php
Schema::create('patients', function (Blueprint $table) {
    $table->id();
    $table->foreignId('sector_id')->constrained('sectors');
    $table->unsignedBigInteger('hospital_id')->nullable()->unique();  // app-generated
    $table->unsignedBigInteger('mswd_id')->nullable()->unique();      // app-generated
    $table->string('first_name');
    $table->string('last_name');
    $table->string('middle_name')->nullable();
    $table->string('extension_name')->nullable();
    $table->date('birthdate')->nullable();
    $table->integer('estimated_age')->nullable();
    $table->string('sex');
    $table->string('civil_status')->nullable();
    $table->string('address')->nullable();
    $table->string('barangay')->nullable();
    $table->string('municipality')->nullable();
    $table->string('province')->nullable();
    $table->string('contact_number')->nullable();
    $table->timestamps();
    $table->softDeletes();

    $table->index(['last_name', 'first_name', 'birthdate']);  // dedup / search
});
```

## 7 — `patient_ids`

```php
Schema::create('patient_ids', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients');
    $table->string('id_type');   // senior, pwd_id, philhealth, solo_parent, national_id, passport, sss_gsis, drivers_license, others
    $table->string('id_number');
    $table->date('date_issued')->nullable();
    $table->date('date_expiry')->nullable();
    $table->boolean('is_verified')->default(false);
    $table->timestamps();
});
```

## 8 — `patient_watchers`

```php
Schema::create('patient_watchers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients');
    $table->string('name');
    $table->string('relationship')->nullable();
    $table->string('contact_number')->nullable();
    $table->string('address')->nullable();
    $table->boolean('is_primary')->default(false);
    $table->timestamps();
    $table->softDeletes();
});
```

## 9 — `patient_family_members`

```php
Schema::create('patient_family_members', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients');
    $table->string('name');
    $table->string('relationship')->nullable();
    $table->integer('age')->nullable();
    $table->string('occupation')->nullable();
    $table->decimal('monthly_income', 12, 2)->nullable();
    $table->string('education')->nullable();
    $table->string('contact_number')->nullable();
    $table->boolean('is_living_with_patient')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

## 10 — `patient_caretakers`

```php
Schema::create('patient_caretakers', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients');
    $table->foreignId('user_id')->constrained('users');
    $table->string('role');   // social_worker, case_manager, nurse, counselor, others
    $table->dateTime('assigned_date');
    $table->dateTime('unassigned_date')->nullable();
    $table->boolean('is_active')->default(true);
    $table->timestamps();
    $table->softDeletes();
});
```

---

## 11 — `cases`

```php
Schema::create('cases', function (Blueprint $table) {
    $table->id();
    $table->foreignId('patient_id')->constrained('patients');
    $table->foreignId('assigned_user_id')->constrained('users');
    $table->string('case_code')->unique();
    $table->string('case_type');        // medical, financial, psychosocial, others
    $table->string('priority_level');   // low, medium, high
    $table->string('status');           // open, ongoing, closed, referred
    $table->string('admission_type');   // OPD, ER, inpatient
    $table->dateTime('date_opened');
    $table->dateTime('date_closed')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

## 12 — `case_activities` (append-only)

```php
Schema::create('case_activities', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('assigned_user_id')->constrained('users');
    $table->foreignId('previous_user_id')->nullable()->constrained('users'); // for reassignments
    $table->string('activity_type'); // case_opened, diagnosis_added, assessment_completed, intervention_given, case_closed, case_reassigned
    $table->dateTime('activity_date');
    $table->text('notes')->nullable();
    $table->timestamps();
});
```

## 13 — `diagnostics`

```php
Schema::create('diagnostics', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('created_by')->constrained('users');
    $table->string('diagnosis_name');
    $table->string('diagnosis_description')->nullable();
    $table->dateTime('diagnosis_date');
    $table->string('attending_physician')->nullable();
    $table->string('facility_name')->nullable();
    $table->timestamps();
});
```

## 14 — `diagnostic_reports` (append-only)

```php
Schema::create('diagnostic_reports', function (Blueprint $table) {
    $table->id();
    $table->foreignId('uploaded_by')->constrained('users');
    $table->foreignId('diagnostic_id')->constrained('diagnostics');
    $table->string('report_type'); // lab, xray, ct_scan, medical_abstract, others
    $table->string('file_name');
    $table->string('file_path');
    $table->string('file_type');
    $table->string('remarks')->nullable();
    $table->timestamps();
});
```

## 15 — `assessments`

```php
Schema::create('assessments', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('created_by')->constrained('users');
    $table->decimal('total_family_income', 12, 2)->nullable();
    $table->string('housing_type')->nullable();
    $table->string('utilities_access')->nullable();
    $table->string('classification'); // indigent, low_income, self_sufficient, others
    $table->text('presenting_problem')->nullable();
    $table->text('family_background')->nullable();
    $table->text('social_functioning')->nullable();
    $table->text('assessment_notes')->nullable();
    $table->text('intervention_plan')->nullable();
    $table->timestamps();
});
```

## 16 — `interventions` (action log, no money)

```php
Schema::create('interventions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('created_by')->constrained('users');
    $table->foreignId('intervention_type_id')->constrained('intervention_type');
    $table->text('description')->nullable();
    $table->date('date_given');
    $table->text('outcome')->nullable();
    $table->timestamps();
    $table->softDeletes();
});
```

## 17 — `documents`

```php
Schema::create('documents', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');
    $table->foreignId('patient_id')->constrained('patients');
    $table->foreignId('intervention_id')->nullable()->constrained('interventions'); // nullable: e.g. intake form has no intervention
    $table->foreignId('uploaded_by')->constrained('users');
    $table->string('document_type'); // intake_form, medical, id, others
    $table->string('file_name');
    $table->string('file_path');
    $table->string('file_type');
    $table->timestamps();
});
```

---

## 18 — `patient_assistance` (disbursement)

```php
Schema::create('patient_assistance', function (Blueprint $table) {
    $table->id();
    $table->foreignId('case_id')->constrained('cases');            // patient reached via case
    $table->foreignId('assistant_type_id')->constrained('assistant_types');
    $table->foreignId('guarantor_id')->nullable()->constrained('guarantors'); // nullable: not every aid has a guarantor
    $table->decimal('amount', 12, 2)->nullable();                  // null may indicate in-kind
    $table->text('notes')->nullable();
    $table->dateTime('date_given');
    $table->foreignId('created_by')->constrained('users');
    $table->string('status');   // pending, approved, released, cancelled
    $table->timestamps();
    $table->softDeletes();
});
```

## 19 — `patient_assistance_logs` (append-only audit trail)

No `timestamps()` — `action_date` is the canonical time. Set `public $timestamps = false;` on the model.

```php
Schema::create('patient_assistance_logs', function (Blueprint $table) {
    $table->id();
    $table->foreignId('assistance_id')->constrained('patient_assistance');
    $table->string('status');   // pending, approved, released, cancelled
    $table->string('action');
    $table->foreignId('action_by')->constrained('users');
    $table->dateTime('action_date');
    $table->timestamps();
});
```

## 20 — `patient_assistance_reports` (DAR — immutable snapshot)

```php
Schema::create('patient_assistance_reports', function (Blueprint $table) {
    $table->id();
    $table->foreignId('assistance_id')->constrained('patient_assistance');
    $table->string('hospital_id')->unique();
    $table->string('mswd_id')->unique();
    $table->string('patient_name');
    $table->string('patient_address')->nullable();
    $table->string('assistant_type');
    $table->string('category');
    $table->decimal('amount', 12, 2)->nullable();
    $table->json('snapshot_json');
    $table->foreignId('released_by')->constrained('users');
    $table->dateTime('released_at');
    $table->boolean('is_void')->default(false);
    $table->timestamps();
});
```

---

## Running

```bash
php artisan migrate            # creates tables in the order above
php artisan migrate:fresh --seed   # drop all + re-run + seed lookups (dev only)
```

Seed the lookup tables (`sectors`, `intervention_type`, `assistant_types` with real `category` values) in `database/seeders/DatabaseSeeder.php` so the app has selectable reference data on first boot.

### If FK ordering ever gets in the way

Create every table with no `->constrained()` calls, then add all foreign keys in one final migration:

```php
Schema::table('patient_assistance', function (Blueprint $table) {
    $table->foreign('case_id')->references('id')->on('cases');
    // ... every FK here
});
```

This decouples table creation from constraint creation, so file order stops mattering. The ordered approach above is the default and works cleanly for this schema.

*End of document.*
