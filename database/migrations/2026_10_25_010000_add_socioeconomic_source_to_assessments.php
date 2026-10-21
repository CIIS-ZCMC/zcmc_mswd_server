<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Which patient socio-economic record an intake's section III and family income were
 * imported from, and when. The sheet uses it to say where its figures came from and to
 * notice that a newer record exists. Nothing is backfilled: stamping today's record onto
 * a past encounter would be invention, so existing intakes pick one up on Refresh.
 * See docs/UIS_SOCIOECONOMIC_IMPORT_PLAN.md.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('socioeconomic_profile_id')->nullable()->after('household_size')
                ->constrained('patient_socioeconomic_profiles')->nullOnDelete();
            $table->timestamp('socioeconomic_imported_at')->nullable()->after('socioeconomic_profile_id');
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('socioeconomic_profile_id');
            $table->dropColumn('socioeconomic_imported_at');
        });
    }
};
