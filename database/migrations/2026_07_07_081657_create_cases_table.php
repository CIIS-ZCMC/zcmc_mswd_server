<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('assigned_user_id')->constrained('users');
            $table->string('case_code')->unique();
            $table->string('case_type');        // medical, financial, psychosocial, others
            $table->string('priority_level');   // low, medium, high
            $table->string('status');           // open, ongoing, closed, referred
            $table->string('admission_type');   // OPD, ER, inpatient
            $table->dateTime('date_opened');
            $table->dateTime('date_closed')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
