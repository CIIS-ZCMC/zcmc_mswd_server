<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->decimal('light_amount', 12, 2)->nullable()->after('light_source');
            $table->decimal('water_amount', 12, 2)->nullable()->after('water_source');
        });
    }

    public function down(): void
    {
        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->dropColumn(['light_amount', 'water_amount']);
        });
    }
};
