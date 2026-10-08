<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // The table now logs two printables: the DOH-MAIFIP slip (ZCMC-F-MSWD-46)
        // and the City Mayor slip (ZCMC-F-MSS-04). Existing rows are MAIFIP.
        Schema::table('acknowledgement_slip_print_logs', function (Blueprint $table) {
            $table->string('form')->default('maifip')->after('id');
            $table->index('form', 'ack_slip_prints_form_index');
        });
    }

    public function down(): void
    {
        Schema::table('acknowledgement_slip_print_logs', function (Blueprint $table) {
            $table->dropIndex('ack_slip_prints_form_index');
            $table->dropColumn('form');
        });
    }
};
