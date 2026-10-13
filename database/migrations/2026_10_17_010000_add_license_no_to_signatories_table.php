<?php

use Database\Seeders\SignatorySeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('signatories', function (Blueprint $table) {
            // Printed as "Licence No." on the Certificate of Eligibility (Indigency).
            $table->string('license_no', 50)->nullable()->after('title');
        });

        // Existing environments: the certificate's MSWD Head prints from day one.
        (new SignatorySeeder)->run();
    }

    public function down(): void
    {
        Schema::table('signatories', function (Blueprint $table) {
            $table->dropColumn('license_no');
        });
    }
};
