<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * The minimum needed to honour "protective-case activity is hidden, not
 * redacted" — there is no protective flag on `cases` to filter on today, and
 * `case_type` (medical|financial|psychosocial|others) has no protective value.
 *
 * Deliberately a plain boolean rather than a new case type or a related table:
 * the Protective Cases module (core module 6) owns the real model, and a
 * boolean can be migrated into a richer type without a data rewrite. This
 * column exists so the audit trail can be filtered now, not to pre-empt that
 * module's design.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->boolean('is_protective')->default(false)->after('case_type')->index();
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropIndex(['is_protective']);
            $table->dropColumn('is_protective');
        });
    }
};
