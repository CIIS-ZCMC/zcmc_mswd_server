<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A history of Unified Intake Sheet (ANNEX B) prints. The UIS is a
        // printable of the case's data, not a stored record — each print of it
        // is logged here (who, when, for which case/encounter).
        Schema::create('uis_print_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->restrictOnDelete();
            $table->foreignId('patient_id')->constrained('patients')->restrictOnDelete();
            // The HIS encounter (cases.transaction_id), denormalized at print time
            // so history is queryable per encounter without joining through cases.
            $table->unsignedBigInteger('transaction_id')->nullable();
            $table->foreignId('printed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('printed_at');
            $table->unsignedInteger('copies')->default(1);
            $table->text('remarks')->nullable();
            $table->timestamps();

            $table->index(['case_id', 'printed_at']);
            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('uis_print_logs');
    }
};
