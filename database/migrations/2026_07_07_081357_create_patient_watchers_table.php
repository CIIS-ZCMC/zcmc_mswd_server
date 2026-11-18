<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_watchers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->string('last_name')->nullable();
            $table->string('first_name')->nullable();
            $table->string('middle_name')->nullable();
            $table->string('extension_name', 50)->nullable();
            $table->string('name'); // the composed full name
            $table->string('relationship_code')->nullable()->index(); // from the watcher_relationship_types master list
            $table->string('contact_number')->nullable();
            // Composed address, plus its PSGC parts (App\Support\PsgcAddress).
            $table->string('address')->nullable();
            $table->string('address_line')->nullable();
            $table->string('address_region_code', 10)->nullable();
            $table->string('address_province_code', 10)->nullable();
            $table->string('address_city_code', 10)->nullable()->index();
            $table->string('address_barangay_code', 10)->nullable()->index();
            $table->foreignId('added_by')->nullable()->constrained('users');
            $table->text('notes')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_watchers');
    }
};
