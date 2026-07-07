<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_assistance_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assistance_id')->constrained('patient_assistance');
            $table->string('status');   // pending, approved, released, cancelled
            $table->string('action');
            $table->foreignId('action_by')->constrained('users');
            $table->dateTime('action_date');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_assistance_logs');
    }
};
