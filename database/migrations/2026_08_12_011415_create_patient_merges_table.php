<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_merges', function (Blueprint $table) {
            $table->id();
            $table->foreignId('source_patient_id')->constrained('patients'); // archived duplicate
            $table->foreignId('target_patient_id')->constrained('patients'); // surviving record
            $table->json('manifest');                                        // record ids moved, per relation
            $table->foreignId('performed_by')->nullable()->constrained('users');
            $table->dateTime('reversed_at')->nullable();
            $table->foreignId('reversed_by')->nullable()->constrained('users');
            $table->timestamps();

            $table->index(['target_patient_id', 'reversed_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_merges');
    }
};
