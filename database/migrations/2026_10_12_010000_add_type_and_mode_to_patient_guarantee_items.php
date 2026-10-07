<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * A breakdown line is now Type of Assistance → Amount → Mode of Assistance → Fund
 * Source. Older lines have no type or mode until their guarantee is next edited.
 * `assistance_source_id` becomes optional; the Library revision removes it.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_guarantee_items', function (Blueprint $table) {
            $table->foreignId('assistant_type_id')->nullable()->after('patient_guarantee_id')->constrained('assistant_types');
            $table->foreignId('mode_of_assistance_id')->nullable()->after('amount')->constrained('mode_of_assistances');
            $table->unsignedBigInteger('assistance_source_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('patient_guarantee_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('mode_of_assistance_id');
            $table->dropConstrainedForeignId('assistant_type_id');
        });
    }
};
