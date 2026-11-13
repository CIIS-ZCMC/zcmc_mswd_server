<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_family_members', function (Blueprint $table) {
            $table->string('extension_name', 50)->nullable()->after('middle_name');
        });

        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->string('extension_name', 50)->nullable()->after('middle_name');
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->string('informant_extension_name', 50)->nullable()->after('informant_middle_name');
        });
    }

    public function down(): void
    {
        Schema::table('patient_family_members', function (Blueprint $table) {
            $table->dropColumn('extension_name');
        });

        Schema::table('patient_watchers', function (Blueprint $table) {
            $table->dropColumn('extension_name');
        });

        Schema::table('assessments', function (Blueprint $table) {
            $table->dropColumn('informant_extension_name');
        });
    }
};
