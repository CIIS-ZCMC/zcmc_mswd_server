<?php

use Database\Seeders\SignatorySeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('signatories', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->text('title')->nullable(); // printed under the name; may span lines
            $table->string('role')->index(); // a Signatory::ROLES key
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // Existing environments: the slip's approver prints from day one.
        (new SignatorySeeder)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('signatories');
    }
};
