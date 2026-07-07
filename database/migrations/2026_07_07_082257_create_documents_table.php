<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('intervention_id')->nullable()->constrained('interventions'); // nullable: e.g. intake form has no intervention
            $table->foreignId('uploaded_by')->constrained('users');
            $table->string('document_type'); // intake_form, medical, id, others
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
