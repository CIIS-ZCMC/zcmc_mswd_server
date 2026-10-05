<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_socioeconomic_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profile_id')->constrained('patient_socioeconomic_profiles');
            $table->string('expense_type'); // free string by design, like assessment_expenses
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_socioeconomic_expenses');
    }
};
