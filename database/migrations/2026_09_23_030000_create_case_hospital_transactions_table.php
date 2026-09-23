<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_hospital_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            // The HIS encounter's surrogate key (psPatRegisters.PK_psPatRegisters).
            // Unique: an encounter attaches to at most one case.
            $table->unsignedBigInteger('his_transaction_id')->unique();
            // The encounter's hospital number (emdPatients.patid), for reference/search.
            $table->unsignedBigInteger('hospital_id')->nullable();
            // Curated point-in-time snapshot of the HIS encounter at attach time.
            $table->json('snapshot')->nullable();
            $table->foreignId('linked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('linked_at')->nullable();
            $table->timestamps();

            $table->index('case_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_hospital_transactions');
    }
};
