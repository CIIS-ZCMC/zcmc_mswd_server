<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // A history of DOH-MAIFIP Acknowledgement Slip (ZCMC-F-MSWD-46) prints. The
        // slip is a printable, not a stored record; each print is logged here. It
        // prints either from an MSWD guarantee or straight from the HIS guarantor
        // ledger entry (psGntrLedgers), so exactly one of the two sources is set.
        Schema::create('acknowledgement_slip_print_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_guarantee_id')->nullable()->constrained('patient_guarantees')->restrictOnDelete();
            // psGntrLedgers.PK_TRXNO when printed from the HIS ledger.
            $table->unsignedBigInteger('his_guarantor_entry_id')->nullable();
            // The local patient, when the HIS patient has been imported.
            $table->foreignId('patient_id')->nullable()->constrained('patients')->restrictOnDelete();
            // The HIS encounter, denormalized so history is queryable per encounter.
            $table->unsignedBigInteger('his_transaction_id')->nullable();
            $table->foreignId('printed_by')->constrained('users')->restrictOnDelete();
            $table->timestamp('printed_at');
            $table->unsignedInteger('copies')->default(1);
            $table->text('remarks')->nullable();
            $table->timestamps();

            // Explicit names: the generated ones exceed MySQL's 64-character limit.
            $table->index(['patient_guarantee_id', 'printed_at'], 'ack_slip_prints_guarantee_printed_at_index');
            $table->index('his_transaction_id', 'ack_slip_prints_his_transaction_id_index');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('acknowledgement_slip_print_logs');
    }
};
