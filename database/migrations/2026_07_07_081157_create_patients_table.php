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
            $table->string('place_of_birth_city_code', 10)->nullable(); // PSGC city or municipality
            // Older present-address parts, still read by the PDFs and the registry
            // search; the server fills them from present_address.
            $table->string('address')->nullable();
            $table->string('barangay')->nullable();
            $table->string('municipality')->nullable();
            $table->string('province')->nullable();
            // Each address is a composed string the PDFs and screens read, plus its PSGC
            // parts (App\Support\PsgcAddress). A free-text address keeps its text and has
            // no codes until someone edits it. docs/PSGC_ADDRESS_PLAN.md.
            $table->string('permanent_address')->nullable();
            $table->string('permanent_address_line')->nullable();
            $table->string('permanent_address_region_code', 10)->nullable();
            $table->string('permanent_address_province_code', 10)->nullable();
            $table->string('permanent_address_city_code', 10)->nullable()->index();
            $table->string('permanent_address_barangay_code', 10)->nullable()->index();
            $table->string('present_address')->nullable();
            $table->string('present_address_line')->nullable();
            $table->string('present_address_region_code', 10)->nullable();
            $table->string('present_address_province_code', 10)->nullable();
            $table->string('present_address_city_code', 10)->nullable()->index();
            $table->string('present_address_barangay_code', 10)->nullable()->index();
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
