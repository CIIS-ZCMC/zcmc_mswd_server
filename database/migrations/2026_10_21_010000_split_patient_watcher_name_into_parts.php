<?php

use App\Support\WatcherName;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * A watcher is now entered as last, first and middle name. `name` stays as the
 * composed full name; existing rows are split best-effort (see WatcherName::split).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->string('last_name')->nullable()->after('patient_id');
            $table->string('first_name')->nullable()->after('last_name');
            $table->string('middle_name')->nullable()->after('first_name');
        });

        DB::table('patient_watchers')->orderBy('id')->each(function ($watcher) {
            $parts = WatcherName::split($watcher->name);

            DB::table('patient_watchers')->where('id', $watcher->id)->update([
                'last_name' => $parts['last'],
                'first_name' => $parts['first'],
                'middle_name' => $parts['middle'],
            ]);
        });
    }

    public function down(): void
    {
        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->dropColumn(['last_name', 'first_name', 'middle_name']);
        });
    }
};
