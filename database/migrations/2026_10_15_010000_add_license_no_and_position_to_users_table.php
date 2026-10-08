<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Printed under a social worker's name on MSWD forms (e.g. the City Mayor
        // Acknowledgement Slip): "License No. 0016804" / "Social Welfare Officer II".
        // MSWD-maintained, unlike the UMIS identity columns.
        Schema::table('users', function (Blueprint $table) {
            $table->string('license_no')->nullable()->after('employee_name');
            $table->string('position')->nullable()->after('license_no');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['license_no', 'position']);
        });
    }
};
