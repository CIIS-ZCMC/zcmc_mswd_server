<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('fund_sources', function (Blueprint $table) {
            // "Others": a guarantee breakdown line using it must say what it is.
            $table->boolean('requires_specify')->default(false)->after('code');
        });
    }

    public function down(): void
    {
        Schema::table('fund_sources', function (Blueprint $table) {
            $table->dropColumn('requires_specify');
        });
    }
};
