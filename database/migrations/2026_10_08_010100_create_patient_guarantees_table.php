<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_guarantees', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            // The HIS encounter's surrogate key (psPatRegisters.PK_psPatRegisters). Not unique:
            // one encounter may have several guarantors.
            $table->unsignedBigInteger('his_transaction_id');
            // The encounter's hospital number (emdPatients.patid), for reference/search.
            $table->unsignedBigInteger('hospital_id')->nullable();
            $table->foreignId('guarantor_id')->constrained('guarantors');
            $table->string('reference_no')->nullable(); // GL / control number
            $table->date('guaranteed_on');
            $table->text('remarks')->nullable();
            $table->foreignId('recorded_by')->constrained('users');
            $table->timestamps();
            $table->softDeletes();

            $table->index('his_transaction_id');
            $table->index(['patient_id', 'his_transaction_id']);
        });

        Schema::create('patient_guarantee_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_guarantee_id')->constrained('patient_guarantees')->cascadeOnDelete();
            $table->foreignId('assistance_source_id')->constrained('assistance_sources');
            $table->string('others_specify')->nullable();
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_guarantee_items');
        Schema::dropIfExists('patient_guarantees');
    }
};
