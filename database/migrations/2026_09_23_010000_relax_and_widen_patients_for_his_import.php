<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            // A HIS-imported patient has no sector, and HIS gender can be blank
            // or unmapped, so neither can be required at the row level. The
            // manual create path still requires both via StorePatientRequest.
            $table->foreignId('sector_id')->nullable()->change();
            $table->string('sex')->nullable()->change();

            // HIS demographics that had no home on patients until now.
            $table->string('email')->nullable()->after('contact_number');
            $table->string('citizenship')->nullable()->after('nationality');
            $table->date('death_date')->nullable()->after('birthdate');
            // Raw HIS time strings — kept as-is rather than parsed.
            $table->string('death_time')->nullable()->after('death_date');
            $table->string('birthtime')->nullable()->after('death_time');
        });
    }

    public function down(): void
    {
        Schema::table('patients', function (Blueprint $table) {
            $table->dropColumn(['email', 'citizenship', 'death_date', 'death_time', 'birthtime']);
            $table->string('sex')->nullable(false)->change();
            $table->foreignId('sector_id')->nullable(false)->change();
        });
    }
};
