<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            // unidentified_patient | abandoned | unaccompanied |
            // patient_refused | under_protective_custody | other
            $table->string('watcher_waiver_reason')->nullable();
            $table->text('watcher_waiver_note')->nullable();
            $table->foreignId('watcher_waived_by')->nullable()->constrained('users');
            $table->dateTime('watcher_waived_at')->nullable();
            $table->boolean('watcher_legacy_exempt')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('watcher_waived_by');
            $table->dropColumn([
                'watcher_waiver_reason',
                'watcher_waiver_note',
                'watcher_waived_at',
                'watcher_legacy_exempt',
            ]);
        });
    }
};
