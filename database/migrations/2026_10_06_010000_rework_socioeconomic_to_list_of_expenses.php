<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The Socio-Economic module becomes the ANNEX B section III "List of Expenses"
 * form: fixed items (one column each) instead of free-text expense lines, and no
 * income / per-capita / household snapshot. See docs/PATIENT_SOCIOECONOMIC_PLAN.md.
 *
 * An alter migration rather than an in-place edit, so it is safe wherever the
 * original create migrations already ran. No data is carried over: the module had
 * no consumers yet.
 */
return new class extends Migration
{
    private const AMOUNTS = [
        'house_rent_amount', 'food', 'transport', 'medical', 'insurance',
        'education', 'clothing', 'house_help', 'others',
    ];

    public function up(): void
    {
        Schema::dropIfExists('patient_socioeconomic_expenses');

        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            foreach (self::AMOUNTS as $column) {
                $table->decimal($column, 12, 2)->nullable();
            }
            $table->string('others_specify')->nullable();
        });

        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->dropColumn([
                'total_family_income', 'other_income_sources', 'housing_type',
                'utilities_access', 'household_size', 'net_per_capita_income',
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->decimal('total_family_income', 12, 2)->nullable();
            $table->json('other_income_sources')->nullable();
            $table->string('housing_type')->nullable();
            $table->string('utilities_access')->nullable();
            $table->unsignedSmallInteger('household_size')->default(1);
            $table->decimal('net_per_capita_income', 12, 2)->nullable();
        });

        Schema::table('patient_socioeconomic_profiles', function (Blueprint $table) {
            $table->dropColumn([...self::AMOUNTS, 'others_specify']);
        });

        Schema::create('patient_socioeconomic_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('profile_id')->constrained('patient_socioeconomic_profiles');
            $table->string('expense_type');
            $table->decimal('amount', 12, 2);
            $table->timestamps();
        });
    }
};
