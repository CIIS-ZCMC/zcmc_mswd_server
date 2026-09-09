<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // Drives WatcherRequirementService::resolve(): a minor or an
            // incapacitated patient needs a registered watcher regardless of
            // admission type. Nullable — unknown is not the same as false,
            // but the resolver treats both the same for now.
            $table->boolean('is_incapacitated')->nullable()->after('estimated_age');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn('is_incapacitated');
        });
    }
};
