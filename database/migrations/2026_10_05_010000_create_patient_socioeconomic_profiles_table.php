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
            $table->decimal('total_family_income', 12, 2)->nullable();
            $table->json('other_income_sources')->nullable();
            $table->string('house_tenure')->nullable();          // owned | rented
            $table->string('housing_type')->nullable();          // free text
            $table->json('light_source')->nullable();            // electricity | kerosene | candle
            $table->json('water_source')->nullable();            // owned | public | artesian_well
            $table->string('utilities_access')->nullable();      // free text
            $table->text('remarks')->nullable();
            $table->unsignedSmallInteger('household_size');      // family members + 1 at record time
            $table->decimal('net_per_capita_income', 12, 2)->nullable();
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
