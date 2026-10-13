<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * The Intake Assessment (UIS) stands on its own: an assessment belongs to a
 * patient and a HIS encounter, and only optionally to a case. Existing rows
 * take both from their case. See docs/INTAKE_ASSESSMENT_PLAN.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('patient_id')->nullable()->after('id')->constrained('patients');
            // The HIS encounter (psPatRegisters), with its labels frozen at intake
            // the way cases.transaction_type is, so a list needs no HIS round trip.
            $table->unsignedBigInteger('his_transaction_id')->nullable()->after('patient_id');
            $table->string('transaction_type')->nullable()->after('his_transaction_id');
            $table->dateTime('encounter_date')->nullable()->after('transaction_type');

            $table->index(['patient_id', 'his_transaction_id'], 'assessments_patient_encounter_index');
        });

        DB::table('assessments')
            ->join('cases', 'cases.id', '=', 'assessments.case_id')
            ->select('assessments.id', 'cases.patient_id', 'cases.transaction_id', 'cases.transaction_type')
            ->orderBy('assessments.id')
            ->chunk(500, function ($rows) {
                foreach ($rows as $row) {
                    DB::table('assessments')->where('id', $row->id)->update([
                        'patient_id' => $row->patient_id,
                        'his_transaction_id' => $row->transaction_id,
                        'transaction_type' => $row->transaction_type,
                    ]);
                }
            });

        Schema::table('assessments', function (Blueprint $table) {
            $table->unsignedBigInteger('case_id')->nullable()->change();
        });

        // A print belongs to the encounter's UIS (patient_id + transaction_id),
        // with or without a case.
        Schema::table('uis_print_logs', function (Blueprint $table) {
            $table->unsignedBigInteger('case_id')->nullable()->change();
            $table->index(['patient_id', 'transaction_id', 'printed_at'], 'uis_print_logs_patient_encounter_index');
        });
    }

    public function down(): void
    {
        Schema::table('uis_print_logs', function (Blueprint $table) {
            $table->dropIndex('uis_print_logs_patient_encounter_index');
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropIndex('assessments_patient_encounter_index');
            $table->dropConstrainedForeignId('patient_id');
            $table->dropColumn(['his_transaction_id', 'transaction_type', 'encounter_date']);
        });
    }
};
