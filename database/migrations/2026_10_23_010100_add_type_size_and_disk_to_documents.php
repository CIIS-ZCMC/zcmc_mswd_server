<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Patient documents: the case becomes optional (a patient's ID or certificate can be
 * filed before any case exists), the type points at the Library list, and the file's
 * size and disk are kept. `document_type` stays as the type's name at upload time.
 * A null `disk` means the default disk, which is where every older row was stored.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->foreignId('case_id')->nullable()->change();
            $table->foreignId('document_type_id')->nullable()->after('uploaded_by')->constrained('document_types');
            $table->unsignedBigInteger('file_size')->nullable()->after('file_type');
            $table->string('disk')->nullable()->after('file_size');
        });

        // Older rows typed the name freely; link the ones that match a Library type.
        DB::table('document_types')->get(['id', 'name'])->each(function ($type) {
            DB::table('documents')
                ->whereNull('document_type_id')
                ->whereRaw('LOWER(TRIM(document_type)) = ?', [mb_strtolower($type->name)])
                ->update(['document_type_id' => $type->id]);
        });

        // The social case study PDFs carry a code, not a name.
        $scsr = DB::table('document_types')->where('name', 'Social Case Study Report')->value('id');

        if ($scsr) {
            DB::table('documents')
                ->whereNull('document_type_id')
                ->where('document_type', 'social_case_study')
                ->update(['document_type_id' => $scsr]);
        }
    }

    public function down(): void
    {
        // Rows without a case cannot satisfy NOT NULL again, and are not ours to delete.
        if (DB::table('documents')->whereNull('case_id')->exists()) {
            throw new RuntimeException('Documents without a case exist; link or remove them before rolling back.');
        }

        Schema::table('documents', function (Blueprint $table) {
            $table->dropConstrainedForeignId('document_type_id');
            $table->dropColumn(['file_size', 'disk']);
            $table->foreignId('case_id')->nullable(false)->change();
        });
    }
};
