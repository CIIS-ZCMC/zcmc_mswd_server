<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * `users.employee_id` holds the UMIS user id (employee profile id) and is the key
 * UMIS sign-in finds a person by, as `iam_sub` is for IAM. Nullable, so the local
 * super admins and IAM-only rows (many NULLs) are unaffected.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->unique('employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['employee_id']);
        });
    }
};
