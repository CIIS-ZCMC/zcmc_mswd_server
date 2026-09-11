<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Where a worker records case progress — docs/SOCIAL_CASE_PLAN.md Phase C.
 *
 * Neither CaseActivity nor Intervention fits: the first is the append-only
 * system milestone chronology (not Auditable, no soft deletes, so an edited or
 * removed clinical note would leave no trail), the second models a service
 * actually delivered against the intervention_type master list. "Phoned the
 * daughter, still no funds, following up Monday" is neither.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('case_progress_notes', function (Blueprint $table) {
            $table->id();
            $table->foreignId('case_id')->constrained('cases')->cascadeOnDelete();
            // Nullable: a case may have no social case study and the note still
            // matters. When one exists, the service links the note to it.
            $table->foreignId('assessment_id')->nullable()->constrained('assessments')->nullOnDelete();
            $table->foreignId('author_id')->constrained('users');

            // Free string plus model constants, the same shape as every other
            // classification column here — no enum to migrate when a ward needs
            // a new kind of contact.
            $table->string('note_type')->default('progress');
            $table->date('note_date');
            $table->text('narrative');

            $table->date('follow_up_on')->nullable();
            $table->dateTime('follow_up_done_at')->nullable();
            $table->foreignId('follow_up_done_by')->nullable()->constrained('users');

            $table->timestamps();
            // An editable working record, so deletions stay recoverable and
            // auditable — a clinical note can be subpoenaed.
            $table->softDeletes();

            $table->index(['case_id', 'note_date']);
            $table->index('follow_up_on');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('case_progress_notes');
    }
};
