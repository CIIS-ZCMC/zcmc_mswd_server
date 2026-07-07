<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_ids', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->string('id_type');   // senior, pwd_id, philhealth, solo_parent, national_id, passport, sss_gsis, drivers_license, others
            $table->string('id_number');
            $table->date('date_issued')->nullable();
            $table->date('date_expiry')->nullable();
            $table->boolean('is_verified')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_ids');
    }
};
