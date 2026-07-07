<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assessments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');
            $table->foreignId('created_by')->constrained('users');
            $table->decimal('total_family_income', 12, 2)->nullable();
            $table->string('housing_type')->nullable();
            $table->string('utilities_access')->nullable();
            $table->string('classification'); // indigent, low_income, self_sufficient, others
            $table->text('presenting_problem')->nullable();
            $table->text('family_background')->nullable();
            $table->text('social_functioning')->nullable();
            $table->text('assessment_notes')->nullable();
            $table->text('intervention_plan')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('assessments');
    }
};
