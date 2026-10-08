<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dar_entries', function (Blueprint $table) {
            $table->id();
            // The worker whose Daily Accomplishment Report this line is on.
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            // Picked from the MSWD registry; a DAR never names a patient by free text.
            $table->foreignId('patient_id')->constrained('patients');
            $table->date('entry_date');
            $table->time('served_time')->nullable();
            $table->string('activity', 40); // DarEntry::ACTIVITIES key
            $table->text('remarks')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['user_id', 'entry_date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dar_entries');
    }
};
