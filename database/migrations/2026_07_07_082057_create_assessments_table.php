<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // "At most one live social case study per case" is enforced with a
        // generated column that collapses to NULL for ordinary assessment rows
        // and soft-deleted ones, under a unique index that ignores NULLs.
        // IF() is MySQL (production); SQLite (tests) needs CASE WHEN.
        $socialCaseGuardExpression = match (DB::getDriverName()) {
            'mysql' => 'IF(social_case_status IS NOT NULL AND deleted_at IS NULL, case_id, NULL)',
            default => 'CASE WHEN social_case_status IS NOT NULL AND deleted_at IS NULL THEN case_id ELSE NULL END',
        };

        Schema::create('assessments', function (Blueprint $table) use ($socialCaseGuardExpression) {
            $table->id();
            // An assessment belongs to a patient and a HIS encounter, and only optionally to a case.
            $table->foreignId('patient_id')->nullable()->constrained('patients');
            $table->unsignedBigInteger('his_transaction_id')->nullable();
            $table->string('transaction_type')->nullable();
            $table->dateTime('encounter_date')->nullable();
            // Frozen copy of the patient's identity and family at intake (the UIS sheet).
            $table->json('uis_snapshot')->nullable();
            $table->timestamp('uis_snapshot_at')->nullable();
            $table->foreignId('uis_snapshot_by')->nullable()->constrained('users')->nullOnDelete();
            $table->dateTime('interviewed_at')->nullable();
            $table->foreignId('interviewed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('case_id')->nullable()->constrained('cases');
            $table->foreignId('parent_assessment_id')->nullable()->constrained('assessments')->nullOnDelete();
            $table->string('reassessment_reason')->nullable();
            $table->foreignId('created_by')->constrained('users');

            // Sign-off — the social case record's two signature blocks.
            $table->foreignId('prepared_by')->nullable()->constrained('users');
            $table->dateTime('prepared_at')->nullable();
            $table->foreignId('noted_by')->nullable()->constrained('users');
            $table->dateTime('noted_at')->nullable();
            $table->dateTime('review_requested_at')->nullable();

            $table->decimal('total_family_income', 12, 2)->nullable();
            $table->decimal('net_per_capita_income', 12, 2)->nullable();
            $table->unsignedInteger('household_size')->nullable(); // frozen with the snapshot
            // The socio-economic record this intake's section III and income were imported from.
            $table->foreignId('socioeconomic_profile_id')->nullable()
                ->constrained('patient_socioeconomic_profiles')->nullOnDelete();
            $table->timestamp('socioeconomic_imported_at')->nullable();
            $table->decimal('calculated_discount_rate', 5, 2)->nullable();
            $table->string('housing_type')->nullable();
            $table->string('house_tenure', 20)->nullable(); // owned|rented
            $table->string('utilities_access')->nullable();
            $table->json('light_source')->nullable();       // electricity|kerosene|candle
            $table->json('water_source')->nullable();       // owned|public|artesian_well

            $table->string('classification'); // indigent, low_income, self_sufficient, others
            $table->string('calculated_classification')->nullable();
            $table->text('classification_override_reason')->nullable();

            // Social case record lifecycle. NULL status = an ordinary assessment
            // row, not the case's SCSR.
            $table->string('social_case_status')->nullable();        // draft|for_review|finalized
            $table->string('social_case_no')->nullable()->unique();  // SCSR-{year}-{6}
            $table->unsignedInteger('revision')->default(1);

            $table->text('presenting_problem')->nullable();
            $table->json('problem_categories')->nullable(); // health|economic|housing|food_nutrition|employment|other
            $table->text('problem_specify')->nullable();
            $table->string('informant_name')->nullable();         // UIS: who was interviewed
            $table->string('informant_last_name')->nullable();
            $table->string('informant_first_name')->nullable();
            $table->string('informant_middle_name')->nullable();
            $table->string('informant_relationship')->nullable(); // UIS: informant's relation to the patient
            $table->string('informant_address', 500)->nullable();
            $table->string('informant_contact_number', 50)->nullable();
            $table->json('other_income_sources')->nullable();     // UIS II: [{source, amount}]
            $table->string('referral_source')->nullable();
            $table->text('reason_for_referral')->nullable();
            $table->text('family_background')->nullable();
            $table->text('medical_history')->nullable();
            $table->text('social_functioning')->nullable();
            $table->text('assessment_notes')->nullable();
            $table->text('recommendation')->nullable();
            $table->string('recommended_assistance')->nullable();
            $table->decimal('recommended_amount', 12, 2)->nullable();
            $table->string('recommendation_mode')->nullable(); // UIS V mode of assistance
            $table->string('fund_source')->nullable();         // UIS V fund source
            $table->text('intervention_plan')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('social_case_status');
            $table->index(['patient_id', 'his_transaction_id'], 'assessments_patient_encounter_index');

            $table->unsignedBigInteger('social_case_guard')->nullable()->storedAs($socialCaseGuardExpression);
            $table->unique('social_case_guard', 'uniq_case_social_case');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
