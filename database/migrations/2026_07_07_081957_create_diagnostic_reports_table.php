<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('diagnostic_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('uploaded_by')->constrained('users');
            $table->foreignId('diagnostic_id')->constrained('diagnostics');
            $table->string('report_type'); // lab, xray, ct_scan, medical_abstract, others
            $table->string('file_name');
            $table->string('file_path');
            $table->string('file_type');
            $table->string('remarks')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('diagnostic_reports');
    }
};
