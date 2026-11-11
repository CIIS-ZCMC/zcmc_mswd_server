<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * PSGC parts of every address, beside the composed string column the PDFs and
 * screens keep reading (App\Support\PsgcAddress). Existing free-text addresses
 * keep their text and have no codes until someone edits them.
 * docs/PSGC_ADDRESS_PLAN.md.
 */
return new class extends Migration
{
    /** Composed column => the table it is on. */
    private const ADDRESSES = [
        ['patients', 'present_address'],
        ['patients', 'permanent_address'],
        ['patient_watchers', 'address'],
        ['assessments', 'informant_address'],
        ['guarantors', 'address'],
    ];

    public function up(): void
    {
        foreach (self::ADDRESSES as [$table, $base]) {
            Schema::table($table, function (Blueprint $t) use ($base) {
                $t->string("{$base}_line")->nullable();
                $t->string("{$base}_region_code", 10)->nullable();
                $t->string("{$base}_province_code", 10)->nullable();
                $t->string("{$base}_city_code", 10)->nullable()->index();
                $t->string("{$base}_barangay_code", 10)->nullable()->index();
            });
        }

        Schema::table('patients', function (Blueprint $t) {
            $t->string('place_of_birth_city_code', 10)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $t) {
            $t->dropColumn('place_of_birth_city_code');
        });

        foreach (array_reverse(self::ADDRESSES) as [$table, $base]) {
            Schema::table($table, function (Blueprint $t) use ($base, $table) {
                $t->dropIndex("{$table}_{$base}_city_code_index");
                $t->dropIndex("{$table}_{$base}_barangay_code_index");
                $t->dropColumn(["{$base}_line", "{$base}_region_code", "{$base}_province_code", "{$base}_city_code", "{$base}_barangay_code"]);
            });
        }
    }
};
