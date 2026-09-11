<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->foreignId('parent_assessment_id')
                ->nullable()
                ->after('case_id')
                ->constrained('assessments')
                ->nullOnDelete();

            $table->string('reassessment_reason')->nullable()->after('parent_assessment_id');
            $table->string('calculated_classification')->nullable()->after('classification');
            $table->text('classification_override_reason')->nullable()->after('calculated_classification');
            $table->decimal('net_per_capita_income', 12, 2)->nullable()->after('total_family_income');
            $table->decimal('calculated_discount_rate', 5, 2)->nullable()->after('net_per_capita_income');
        });
    }

    public function down(): void
    {
        Schema::table('assessments', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_assessment_id');
            $table->dropColumn([
                'reassessment_reason',
                'calculated_classification',
                'classification_override_reason',
                'net_per_capita_income',
                'calculated_discount_rate',
            ]);
        });
    }
};

