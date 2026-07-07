<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostics', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');
            $table->foreignId('created_by')->constrained('users');
            $table->string('diagnosis_name');
            $table->string('diagnosis_description')->nullable();
            $table->dateTime('diagnosis_date');
            $table->string('attending_physician')->nullable();
            $table->string('facility_name')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostics');
    }
};
