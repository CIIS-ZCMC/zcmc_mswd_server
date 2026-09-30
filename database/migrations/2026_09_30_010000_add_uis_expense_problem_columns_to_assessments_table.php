<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * UIS sections III (house/light/water) and IV (problem categories) — the
 * checkbox fields the printable used to leave blank. See docs/UIS_EXPENSES_PROBLEMS_PLAN.md.
 * All nullable: existing rows print the same blank boxes as before.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->json('problem_categories')->nullable()->after('presenting_problem'); // health|economic|housing|food_nutrition|employment|other
            $table->text('problem_specify')->nullable()->after('problem_categories');
            $table->string('house_tenure', 20)->nullable()->after('housing_type'); // owned|rented
            $table->json('light_source')->nullable()->after('utilities_access'); // electricity|kerosene|candle
            $table->json('water_source')->nullable()->after('light_source'); // owned|public|artesian_well
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn(['problem_categories', 'problem_specify', 'house_tenure', 'light_source', 'water_source']);
        });
    }
};
