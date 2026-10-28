<?php

use Database\Seeders\AssistantTypeSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('assistant_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->nullable();
            $table->string('category');                 // e.g. medical, food, financial, burial, transportation, others
            $table->string('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // The Library's starting list of types of assistance.
        (new AssistantTypeSeeder)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('assistant_types');
    }
};
