<?php

use Database\Seeders\FundSourceSeeder;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * The former Assistance Sources (City Mayor, City Council, …, Others) are fund sources.
 * Each one is copied into `fund_sources`, reusing a fund source with the same code or
 * name, and every guarantee breakdown line gets a `fund_source_id` from it.
 * `assistance_source_id` stays until the Assistance Sources list is removed.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('patient_guarantee_items', function (Blueprint $table) {
            $table->foreignId('fund_source_id')->nullable()->after('assistance_source_id')->constrained('fund_sources');
        });

        $this->merge();

        // Fresh installs (and any source that never existed here) get the full list.
        (new FundSourceSeeder)->run();
    }

    /**
     * Copies every assistance source, deleted ones included, and backfills the lines.
     * Safe to run again: a source already copied maps to its fund source by code.
     *
     * @return array<int, int> assistance_source_id => fund_source_id
     */
    public function merge(): array
    {
        $map = [];
        $nextOrder = (int) DB::table('fund_sources')->max('sort_order');

        foreach (DB::table('assistance_sources')->orderBy('id')->get() as $source) {
            $fund = $this->matchingFund($source);

            if ($fund === null) {
                $fundId = DB::table('fund_sources')->insertGetId([
                    'name' => $source->name,
                    'code' => $this->uniqueCode($source->code ?: Str::slug($source->name, '_')),
                    'requires_specify' => (bool) $source->requires_specify,
                    'is_active' => (bool) $source->is_active,
                    'sort_order' => ++$nextOrder,
                    'created_at' => $source->created_at ?? now(),
                    'updated_at' => now(),
                    'deleted_at' => $source->deleted_at,
                ]);
            } else {
                $fundId = $fund->id;

                if ($source->requires_specify && ! $fund->requires_specify) {
                    DB::table('fund_sources')->where('id', $fundId)->update(['requires_specify' => true]);
                }
            }

            $map[$source->id] = $fundId;

            DB::table('patient_guarantee_items')
                ->where('assistance_source_id', $source->id)
                ->update(['fund_source_id' => $fundId]);
        }

        return $map;
    }

    /** A fund source with the same code, else the same name (case-insensitive). */
    private function matchingFund(object $source): ?object
    {
        if (filled($source->code)) {
            $byCode = DB::table('fund_sources')->where('code', $source->code)->first();

            if ($byCode !== null) {
                return $byCode;
            }
        }

        return DB::table('fund_sources')
            ->whereRaw('lower(name) = ?', [Str::lower(trim($source->name))])
            ->first();
    }

    /** A Library code (lowercase, digits, underscores) not yet taken. */
    private function uniqueCode(string $code): string
    {
        $base = trim(preg_replace('/[^a-z0-9_]+/', '_', Str::lower($code)), '_') ?: 'fund_source';
        $candidate = $base;
        $suffix = 2;

        while (DB::table('fund_sources')->where('code', $candidate)->exists()) {
            $candidate = "{$base}_{$suffix}";
            $suffix++;
        }

        return $candidate;
    }

    /**
     * Drops the line link only. The copied fund sources stay: assessments may already
     * use them, and the assistance sources still hold the original rows.
     */
    public function down(): void
    {
        Schema::table('patient_guarantee_items', function (Blueprint $table) {
            $table->dropConstrainedForeignId('fund_source_id');
        });
    }
};
