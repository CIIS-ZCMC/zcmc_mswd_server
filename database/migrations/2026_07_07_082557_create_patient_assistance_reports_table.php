<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_assistance_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('assistance_id')->constrained('patient_assistance');
            $table->string('hospital_id')->unique();
            $table->string('mswd_id')->unique();
            $table->string('patient_name');
            $table->string('patient_address')->nullable();
            $table->string('assistant_type');
            $table->string('category');
            $table->decimal('amount', 12, 2)->nullable();
            $table->json('snapshot_json');
            $table->foreignId('released_by')->constrained('users');
            $table->dateTime('released_at');
            $table->boolean('is_void')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_assistance_reports');
    }
};
