<?php

use Database\Seeders\FundSourceSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('fund_sources', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code')->unique(); // what assessments.fund_source stores
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // Existing environments: the codes already stored on assessments must resolve.
        (new FundSourceSeeder)->run();
    }

    public function down(): void
    {
        Schema::dropIfExists('fund_sources');
    }
};
