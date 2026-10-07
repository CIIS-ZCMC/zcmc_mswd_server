<?php

use Database\Seeders\AssistantTypeSeeder;
use Illuminate\Database\Migrations\Migration;

/**
 * Types of Assistance join the Library: existing environments get the starting list.
 * Additive only; types already present are left alone.
 */
return new class extends Migration
{
    public function up(): void
    {
        (new AssistantTypeSeeder)->run();
    }

    public function down(): void
    {
        // The rows may already be used by assistance records, so they stay.
    }
};
