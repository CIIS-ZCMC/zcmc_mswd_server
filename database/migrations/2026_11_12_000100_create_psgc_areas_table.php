<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Philippine Standard Geographic Code: regions, provinces, cities and
 * municipalities (with Manila's districts), and barangays, keyed on the
 * 10-digit PSGC code. Loaded by `php artisan psgc:load`; addresses on records
 * point here by code. docs/PSGC_ADDRESS_PLAN.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('psgc_areas', function (Blueprint $table) {
            $table->string('code', 10)->primary();
            // region | province | city | barangay. A "city" is any city,
            // municipality, Manila district (SubMun) or special area (SGU).
            $table->string('level', 10);
            // PSGC Cloud's type for a city: City, Mun, SubMun or SGU.
            $table->string('kind', 10)->nullable();
            $table->string('name');
            $table->string('region_code', 10)->nullable();
            // Null for independent cities and NCR, which belong to no province.
            $table->string('province_code', 10)->nullable();
            // Barangays: their city. Manila districts: the City of Manila.
            $table->string('city_code', 10)->nullable();
            $table->string('zip_code', 10)->nullable();
            // Codes PSA no longer lists are retired, never deleted, so old
            // addresses keep their names.
            $table->timestamp('retired_at')->nullable();
            $table->timestamps();

            $table->index(['level', 'name']);
            $table->index(['level', 'city_code']);
            $table->index(['level', 'province_code']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('psgc_areas');
    }
};
