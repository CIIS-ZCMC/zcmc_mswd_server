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
            $table->foreignId('case_id')->nullable()->constrained('cases'); // a patient's ID or certificate can be filed before any case
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('intervention_id')->nullable()->constrained('interventions'); // nullable: e.g. intake form has no intervention
            $table->foreignId('uploaded_by')->constrained('users');
            $table->foreignId('document_type_id')->nullable()->constrained('document_types');
            $table->string('document_type'); // the type's name at upload time
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type');
            $table->unsignedBigInteger('file_size')->nullable();
            $table->string('disk')->nullable(); // null = the default disk
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
