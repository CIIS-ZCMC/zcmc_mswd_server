<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('service_visits', function (Blueprint $table) {
            // The latest take-over; earlier ones stay in the audit trail.
            $table->foreignId('taken_over_by')->nullable()->after('cancelled_by')->constrained('users')->restrictOnDelete();
            $table->dateTime('taken_over_at')->nullable()->after('taken_over_by');
            $table->string('takeover_reason')->nullable()->after('taken_over_at');
        });
    }

    public function down(): void
    {
        Schema::table('service_visits', function (Blueprint $table) {
            $table->dropConstrainedForeignId('taken_over_by');
            $table->dropColumn(['taken_over_at', 'takeover_reason']);
        });
    }
};
