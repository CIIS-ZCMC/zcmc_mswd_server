<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unified_intake_sheets', function (Blueprint $table) {
            $table->id();
            $table->string('intake_no')->unique();               // app-generated, e.g. UIS-2026-000123
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('case_id')->nullable()->constrained('cases');
            $table->foreignId('assessment_id')->nullable()->constrained('assessments');
            $table->foreignId('intake_worker_id')->constrained('users');
            $table->string('referral_source')->nullable();       // walk_in, ward_referral, mswdo, others
            $table->text('referral_details')->nullable();
            $table->dateTime('date_of_intake');
            $table->string('status')->default('draft');          // draft, submitted, finalized, cancelled
            $table->dateTime('submitted_at')->nullable();
            $table->dateTime('finalized_at')->nullable();
            $table->foreignId('finalized_by')->nullable()->constrained('users');
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unified_intake_sheets');
    }
};
