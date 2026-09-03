<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_family_members', function (Blueprint $table) {
            // Mirrors patients.birthdate + estimated_age: the exact date when it
            // is known, with the existing `age` column kept as the fallback for
            // relatives whose birthdate nobody can supply.
            $table->date('birthdate')->nullable()->after('relationship');
            // Plain nullable string, same shape as patients.sex — the Filament
            // Select constrains the values. Nullable here (unlike the patient's
            // own) because a relative's sex is not always recorded.
            $table->string('sex')->nullable()->after('birthdate');
        });

        // Separate closure on purpose: a blueprint compiles every statement
        // before running any of them, so a rename must not share one with
        // columns that could anchor on the new name.
        Schema::table('patient_family_members', function (Blueprint $table) {
            $table->renameColumn('education', 'educational_attainment');
        });
    }

    public function down(): void
    {
        Schema::table('patient_family_members', function (Blueprint $table) {
            $table->renameColumn('educational_attainment', 'education');
        });

        Schema::table('patient_family_members', function (Blueprint $table) {
            $table->dropColumn(['birthdate', 'sex']);
        });
    }
};
