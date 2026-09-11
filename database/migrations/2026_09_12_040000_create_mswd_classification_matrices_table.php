<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mswd_classification_matrices', function (Blueprint $table) {
            $table->id();
            $table->string('code')->unique(); // A, B, C1, C2, C3, D
            $table->string('name');
            $table->decimal('min_per_capita_income', 12, 2)->nullable();
            $table->decimal('max_per_capita_income', 12, 2)->nullable();
            $table->decimal('discount_percentage', 5, 2);
            $table->decimal('max_assistance_cap', 12, 2)->nullable();
            $table->boolean('is_indigent')->default(false);
            $table->timestamps();
            $table->softDeletes();
        });

        // Seed default MSWD DOH Classification Matrix
        DB::table('mswd_classification_matrices')->insert([
            [
                'code' => 'A',
                'name' => 'Full Pay / Financially Capable',
                'min_per_capita_income' => 10000.01,
                'max_per_capita_income' => null,
                'discount_percentage' => 0.00,
                'max_assistance_cap' => null,
                'is_indigent' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'B',
                'name' => 'Partial Pay (25% Discount)',
                'min_per_capita_income' => 7000.01,
                'max_per_capita_income' => 10000.00,
                'discount_percentage' => 25.00,
                'max_assistance_cap' => 50000.00,
                'is_indigent' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'C1',
                'name' => 'Partial Pay (50% Discount)',
                'min_per_capita_income' => 5000.01,
                'max_per_capita_income' => 7000.00,
                'discount_percentage' => 50.00,
                'max_assistance_cap' => 100000.00,
                'is_indigent' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'C2',
                'name' => 'Partial Pay (75% Discount)',
                'min_per_capita_income' => 3000.01,
                'max_per_capita_income' => 5000.00,
                'discount_percentage' => 75.00,
                'max_assistance_cap' => 150000.00,
                'is_indigent' => false,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'C3',
                'name' => 'Indigent (100% Discount)',
                'min_per_capita_income' => 0.00,
                'max_per_capita_income' => 3000.00,
                'discount_percentage' => 100.00,
                'max_assistance_cap' => 250000.00,
                'is_indigent' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'code' => 'D',
                'name' => 'Indigent / No Balance Billing (NBB)',
                'min_per_capita_income' => null,
                'max_per_capita_income' => 0.00,
                'discount_percentage' => 100.00,
                'max_assistance_cap' => null,
                'is_indigent' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ],
        ]);
    }

    public function down(): void
    {
        Schema::dropIfExists('mswd_classification_matrices');
    }
};

