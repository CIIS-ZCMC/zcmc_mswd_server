<?php

use App\Models\TurnaroundTarget;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('turnaround_targets', function (Blueprint $table) {
            $table->id();
            $table->string('stage', 30)->unique();
            $table->unsignedSmallInteger('minutes');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // Placeholder Citizen's Charter targets, so existing environments evaluate
        // compliance without a seeder run. MSWD tunes them in the Library.
        $now = now();
        DB::table('turnaround_targets')->insert(collect(TurnaroundTarget::DEFAULT_TARGETS)
            ->map(fn (int $minutes, string $stage) => [
                'stage' => $stage, 'minutes' => $minutes, 'is_active' => true,
                'created_at' => $now, 'updated_at' => $now,
            ])
            ->values()
            ->all());
    }

    public function down(): void
    {
        Schema::dropIfExists('turnaround_targets');
    }
};
