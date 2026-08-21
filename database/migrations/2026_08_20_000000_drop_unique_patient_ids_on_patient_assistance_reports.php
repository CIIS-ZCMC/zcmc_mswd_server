<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A report snapshots the patient's hospital_id / mswd_id at release time. A
 * patient can have several released assistances (hence several reports), and
 * those identifiers may be unset, so the columns mirror the patient's rather
 * than being unique or required.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_assistance_reports', function (Blueprint $table) {
            $table->dropUnique(['hospital_id']);
            $table->dropUnique(['mswd_id']);
            $table->string('hospital_id')->nullable()->change();
            $table->string('mswd_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patient_assistance_reports', function (Blueprint $table) {
            $table->string('hospital_id')->nullable(false)->unique()->change();
            $table->string('mswd_id')->nullable(false)->unique()->change();
        });
    }
};
