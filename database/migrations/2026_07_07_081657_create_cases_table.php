<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cases', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients');
            $table->foreignId('assigned_user_id')->constrained('users');
            // Who opened the case. Distinct from assigned_user_id (the current
            // handler): set once at open and never rewritten on reassignment.
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('case_code')->unique();
            $table->string('case_type');        // medical, financial, psychosocial, others
            $table->boolean('is_protective')->default(false)->index();
            $table->string('priority_level');   // low, medium, high
            $table->string('status');           // open, ongoing, closed, referred
            $table->string('admission_type');   // OPD, ER, inpatient
            // The HIS encounter this case was opened for
            // (psPatRegisters.PK_psPatRegisters). No FK: it lives on the sqlsrv
            // connection. Nullable for OPD / walk-in cases. One case per encounter
            // is enforced in CaseModelService, not by a DB unique index.
            $table->unsignedBigInteger('transaction_id')->nullable();
            // Snapshot of the encounter's transaction_type label, frozen at open.
            $table->string('transaction_type')->nullable();
            // Manual triage colour; see App\Enums\CardColor.
            $table->string('card_color')->default('white');
            $table->dateTime('date_opened');
            $table->dateTime('date_closed')->nullable();

            // unidentified_patient | abandoned | unaccompanied |
            // patient_refused | under_protective_custody | other
            $table->string('watcher_waiver_reason')->nullable();
            $table->text('watcher_waiver_note')->nullable();
            $table->foreignId('watcher_waived_by')->nullable()->constrained('users');
            $table->dateTime('watcher_waived_at')->nullable();
            $table->boolean('watcher_legacy_exempt')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->index('transaction_id');
            $table->index('case_type');
            $table->index('priority_level');
            // The caseload query's leading predicate: one worker's open cases.
            $table->index(['assigned_user_id', 'status'], 'cases_assigned_user_status_index');
            // The default list sort, narrowed by status.
            $table->index(['status', 'date_opened'], 'cases_status_date_opened_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cases');
    }
};
