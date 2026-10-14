<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('service_visits', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            // HIS psPatRegisters id. Not an FK: HIS lives read-only on sqlsrv.
            $table->unsignedBigInteger('his_transaction_id');
            $table->string('status', 20); // ServiceVisit::STATUS_*
            $table->string('purpose', 120)->nullable();
            $table->text('remarks')->nullable();
            // Turnaround stamps, always from the server clock.
            $table->dateTime('arrived_at');
            $table->dateTime('started_at')->nullable();
            $table->dateTime('completed_at')->nullable();
            $table->dateTime('cancelled_at')->nullable();
            $table->string('cancel_reason')->nullable();
            $table->foreignId('received_by')->constrained('users')->restrictOnDelete();
            $table->foreignId('served_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('completed_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->foreignId('cancelled_by')->nullable()->constrained('users')->restrictOnDelete();
            $table->timestamps();

            $table->index(['status', 'arrived_at']);
            $table->index(['served_by', 'completed_at']);
            $table->index(['patient_id', 'his_transaction_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('service_visits');
    }
};
