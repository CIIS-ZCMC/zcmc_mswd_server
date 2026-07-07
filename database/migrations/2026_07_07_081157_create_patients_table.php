<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patients', function (Blueprint $table) {
            $table->id();
            $table->foreignId('sector_id')->constrained('sectors');
            $table->unsignedBigInteger('hospital_id')->nullable()->unique();  // app-generated
            $table->unsignedBigInteger('mswd_id')->nullable()->unique();      // app-generated
            $table->string('first_name');
            $table->string('last_name');
            $table->string('middle_name')->nullable();
            $table->string('extension_name')->nullable();
            $table->date('birthdate')->nullable();
            $table->integer('estimated_age')->nullable();
            $table->string('sex');
            $table->string('civil_status')->nullable();
            $table->string('address')->nullable();
            $table->string('barangay')->nullable();
            $table->string('municipality')->nullable();
            $table->string('province')->nullable();
            $table->string('contact_number')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['last_name', 'first_name', 'birthdate']);  // dedup / search
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patients');
    }
};
