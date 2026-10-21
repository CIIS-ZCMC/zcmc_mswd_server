<?php

use Database\Seeders\DocumentTypeSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_types', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // Existing environments: the upload dropdown needs its list.
        (new DocumentTypeSeeder)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('document_types');
    }
};
