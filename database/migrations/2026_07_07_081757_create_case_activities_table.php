<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_activities', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');
            $table->foreignId('assigned_user_id')->constrained('users');
            $table->foreignId('previous_user_id')->nullable()->constrained('users'); // for reassignments
            $table->string('activity_type'); // case_opened, diagnosis_added, assessment_completed, intervention_given, case_closed, case_reassigned
            $table->dateTime('activity_date');
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_activities');
    }
};
