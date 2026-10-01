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
            // Nullable: a HIS-imported patient has no sector. The manual create
            // path still requires it via StorePatientRequest.
            $table->foreignId('sector_id')->nullable()->constrained('sectors');
            $table->unsignedBigInteger('hospital_id')->nullable()->unique();  // app-generated
            $table->unsignedBigInteger('mswd_id')->nullable()->unique();      // app-generated
            $table->string('first_name');
            $table->string('last_name');
            $table->string('middle_name')->nullable();
            $table->string('extension_name')->nullable();
            $table->date('birthdate')->nullable();
            $table->date('death_date')->nullable();
            $table->string('death_time')->nullable();   // raw HIS time string
            $table->string('birthtime')->nullable();    // raw HIS time string
            $table->integer('estimated_age')->nullable();
            // Drives WatcherRequirementService::resolve(): a minor or incapacitated
            // patient needs a registered watcher. Nullable — unknown is not false.
            $table->boolean('is_incapacitated')->nullable();
            $table->string('sex')->nullable();          // HIS gender can be blank/unmapped
            $table->string('civil_status')->nullable();
            $table->string('religion')->nullable();
            $table->string('nationality')->nullable();
            $table->string('citizenship')->nullable();
            $table->string('place_of_birth')->nullable();
            $table->string('address')->nullable();
            $table->string('barangay')->nullable();
            $table->string('municipality')->nullable();
            $table->string('province')->nullable();
            $table->string('permanent_address')->nullable();
            $table->string('present_address')->nullable();
            $table->string('educational_attainment')->nullable();
            $table->string('occupation')->nullable();
            $table->string('employer')->nullable();
            // The patient's own income — distinct from assessments.total_family_income
            // (household) and patient_family_members.monthly_income (each relative's).
            $table->decimal('monthly_income', 12, 2)->nullable();
            $table->string('contact_number')->nullable();
            $table->string('email')->nullable();
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
