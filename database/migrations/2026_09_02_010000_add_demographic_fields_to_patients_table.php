<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->string('religion')->nullable()->after('civil_status');
            $table->string('nationality')->nullable()->after('religion');
            $table->string('place_of_birth')->nullable()->after('nationality');
            // Plain strings, same shape as the existing `address` field — not a
            // structured breakdown. `address`/`barangay`/`municipality`/`province`
            // are left untouched; these are the explicit permanent/present
            // designations requested on top of that general locality data.
            $table->string('permanent_address')->nullable()->after('province');
            $table->string('present_address')->nullable()->after('permanent_address');
            $table->string('educational_attainment')->nullable()->after('present_address');
            $table->string('occupation')->nullable()->after('educational_attainment');
            $table->string('employer')->nullable()->after('occupation');
            // The patient's own income — distinct from assessments.total_family_income
            // (household total) and family_members.monthly_income (each relative's own).
            $table->decimal('monthly_income', 12, 2)->nullable()->after('employer');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn([
                'religion', 'nationality', 'place_of_birth',
                'permanent_address', 'present_address',
                'educational_attainment', 'occupation', 'employer', 'monthly_income',
            ]);
        });
    }
};
