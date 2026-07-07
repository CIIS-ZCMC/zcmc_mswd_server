<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('patient_assistance', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases');            // patient reached via case
            $table->foreignId('assistant_type_id')->constrained('assistant_types');
            $table->foreignId('guarantor_id')->nullable()->constrained('guarantors'); // nullable: not every aid has a guarantor
            $table->decimal('amount', 12, 2)->nullable();                  // null may indicate in-kind
            $table->text('notes')->nullable();
            $table->dateTime('date_given');
            $table->foreignId('created_by')->constrained('users');
            $table->string('status');   // pending, approved, released, cancelled
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('patient_assistance');
    }
};
