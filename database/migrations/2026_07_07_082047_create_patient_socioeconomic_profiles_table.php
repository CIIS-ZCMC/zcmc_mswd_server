<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The patient-level Socio-Economic module: a dated, append-only record of a
 * patient's household income, living conditions and expenses. Deliberately keyed
 * by patient only — no link to cases, assessments or the UIS (see
 * docs/PATIENT_SOCIOECONOMIC_PLAN.md).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->date('recorded_on');
            $table->foreignId('recorded_by')->constrained('users');
            // The family's monthly income, snapshotted when the record is created:
            // the patient's and each family member's, plus other sources typed in.
            $table->decimal('patient_income', 12, 2)->nullable();
            $table->json('income_members')->nullable();       // [{name, relationship, monthly_income}]
            $table->json('other_income_sources')->nullable(); // [{source, amount}]
            $table->decimal('total_family_income', 12, 2)->nullable();
            $table->string('house_tenure')->nullable();          // owned | rented
            $table->json('light_source')->nullable();            // electricity | kerosene | candle
            $table->json('water_source')->nullable();            // owned | public | artesian_well
            // ANNEX B section III "List of Expenses": one column per fixed item.
            foreach ([
                'house_rent_amount', 'food', 'transport', 'medical', 'insurance',
                'education', 'clothing', 'house_help', 'others',
            ] as $expense) {
                $table->decimal($expense, 12, 2)->nullable();
            }
            $table->string('others_specify')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['patient_id', 'recorded_on', 'id'], 'idx_socioeconomic_patient_recorded');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_socioeconomic_profiles');
    }
};
