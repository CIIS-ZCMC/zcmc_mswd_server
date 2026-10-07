<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Phase 4 of the Library Revision: Removes the legacy Assistance Sources list
 * and drops patient_guarantee_items.assistance_source_id now that guarantee
 * breakdown lines store fund_source_id.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('patient_guarantee_items') && Schema::hasColumn('patient_guarantee_items', 'assistance_source_id')) {
            Schema::table('patient_guarantee_items', function (Blueprint $table) {
                $table->dropConstrainedForeignId('assistance_source_id');
            });
        }

        Schema::dropIfExists('assistance_sources');
    }

    public function down(): void
    {
        if (! Schema::hasTable('assistance_sources')) {
            Schema::create('assistance_sources', function (Blueprint $table) {
                $table->id();
                $table->string('name');
                $table->string('code')->nullable()->unique();
                $table->boolean('requires_specify')->default(false);
                $table->boolean('is_active')->default(true);
                $table->timestamps();
                $table->softDeletes();
            });
        }

        if (Schema::hasTable('patient_guarantee_items') && ! Schema::hasColumn('patient_guarantee_items', 'assistance_source_id')) {
            Schema::table('patient_guarantee_items', function (Blueprint $table) {
                $table->foreignId('assistance_source_id')->nullable()->after('amount')->constrained('assistance_sources');
            });
        }
    }
};
