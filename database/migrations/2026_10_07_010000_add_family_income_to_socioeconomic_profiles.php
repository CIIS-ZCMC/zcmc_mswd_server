<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The List of Expenses module also manages the family's income. `patient_income` and
 * `income_members` are a snapshot of the patient's and family members' monthly incomes
 * taken when the record is created; `other_income_sources` are typed in the module;
 * `total_family_income` is the server-computed sum of the three.
 * See docs/PATIENT_SOCIOECONOMIC_PLAN.md (S9). No data to carry over.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->decimal('patient_income', 12, 2)->nullable();
            $table->json('income_members')->nullable();       // [{name, relationship, monthly_income}]
            $table->json('other_income_sources')->nullable(); // [{source, amount}]
            $table->decimal('total_family_income', 12, 2)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->dropColumn(['patient_income', 'income_members', 'other_income_sources', 'total_family_income']);
        });
    }
};
