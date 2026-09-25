<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            // Who opened the case. Distinct from assigned_user_id (the current
            // handler, which the assignment / My Caseload workflow keys off):
            // created_by is set once at open and never rewritten on reassignment.
            $table->foreignId('created_by')->nullable()->after('assigned_user_id')
                ->constrained('users')->nullOnDelete();

            // The HIS encounter this case was opened for
            // (psPatRegisters.PK_psPatRegisters). No FK: it lives on the sqlsrv
            // connection. Nullable for OPD / walk-in cases with no encounter.
            // One case per encounter is enforced in CaseModelService, not by a
            // DB unique index (mirrors CaseHospitalTransactionService).
            $table->unsignedBigInteger('transaction_id')->nullable()->after('admission_type');

            // Snapshot of the encounter's transaction_type label, frozen at open.
            $table->string('transaction_type')->nullable()->after('transaction_id');

            // Manual triage colour; see App\Enums\CardColor.
            $table->string('card_color')->default('white')->after('transaction_type');

            $table->index('transaction_id');
        });
    }

    public function down(): void
    {
        Schema::table('cases', function (Blueprint $table) {
            $table->dropConstrainedForeignId('created_by');
            $table->dropIndex(['transaction_id']);
            $table->dropColumn(['transaction_id', 'transaction_type', 'card_color']);
        });
    }
};
