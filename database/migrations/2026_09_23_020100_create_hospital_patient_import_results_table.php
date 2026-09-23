<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('hospital_patient_import_results', function (Blueprint $table) {
            $table->id();
            $table->foreignId('batch_id')->constrained('hospital_patient_import_batches')->cascadeOnDelete();
            // The HIS surrogate key (emdPatients.PK_emdPatients) that was requested.
            $table->unsignedBigInteger('hospital_patient_id');
            // The hospital number (emdPatients.patid); null when the HIS row lacks one.
            $table->unsignedBigInteger('hospital_id')->nullable();
            $table->string('outcome');
            $table->foreignId('patient_id')->nullable()->constrained('patients')->nullOnDelete();
            $table->string('message')->nullable();
            $table->timestamps();

            $table->index('batch_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hospital_patient_import_results');
    }
};
