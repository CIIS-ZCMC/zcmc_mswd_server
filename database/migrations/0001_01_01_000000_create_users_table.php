<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // People who sign in through ZCMC IAM are keyed on the IAM subject. They have
            // no UMIS identity and no local password, so those columns accept null; the
            // local super admins are the only rows with a password.
            $table->string('iam_sub')->nullable()->unique();
            $table->unsignedBigInteger('employee_id')->nullable();   // UMIS user id, not auto-increment
            $table->integer('employee_number')->nullable();          // UMIS employee_id
            $table->string('employee_name');             // UMIS full_name
            $table->string('license_no')->nullable();
            $table->string('position')->nullable();
            $table->string('placement')->nullable();
            $table->json('iam_org_roles')->nullable();
            $table->string('email');                     // UMIS email
            $table->string('password')->nullable();
            $table->string('role')->nullable();            // display/filter cache only
            $table->boolean('is_active')->default(true);
            $table->dateTime('synced_at')->nullable();
            $table->timestamps();
        });

        // Optional: keep if you use Laravel sessions alongside UMIS SSO.
        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('sessions');
        Schema::dropIfExists('users');
    }
};
