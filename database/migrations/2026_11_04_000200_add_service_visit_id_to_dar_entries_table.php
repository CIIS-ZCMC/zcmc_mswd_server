<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('dar_entries', function (Blueprint $table) {
            // Not unique: a soft-deleted line must not stop the visit being filed again.
            // StoreDarEntryRequest allows one live line per worker.
            $table->foreignId('service_visit_id')->nullable()->after('patient_id')->constrained('service_visits')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('dar_entries', function (Blueprint $table) {
            $table->dropConstrainedForeignId('service_visit_id');
        });
    }
};
