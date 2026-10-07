<?php

use App\Models\FundSource;
use App\Models\ModeOfAssistance;
use Database\Seeders\FundSourceSeeder;
use Database\Seeders\ModeOfAssistanceSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);

it('seeds every mode of assistance in the migration, keeping the UIS codes', function () {
    expect(ModeOfAssistance::ordered()->pluck('name', 'code')->all())
        ->toBe(ModeOfAssistanceSeeder::MODES)
        ->and(ModeOfAssistance::where('is_active', false)->count())->toBe(0);
});

it('seeds every fund source in the migration, keeping the UIS codes', function () {
    expect(FundSource::ordered()->pluck('name', 'code')->all())
        ->toBe(FundSourceSeeder::SOURCES)
        ->and(FundSource::where('is_active', false)->count())->toBe(0);
});

it('re-runs the seeders without duplicating or overwriting edited rows', function () {
    ModeOfAssistance::where('code', 'counseling')->update(['name' => 'Psychosocial Counseling']);
    FundSource::where('code', 'pcso')->update(['is_active' => false]);

    (new ModeOfAssistanceSeeder)->run();
    (new FundSourceSeeder)->run();

    expect(ModeOfAssistance::count())->toBe(count(ModeOfAssistanceSeeder::MODES))
        ->and(FundSource::count())->toBe(count(FundSourceSeeder::SOURCES))
        ->and(ModeOfAssistance::where('code', 'counseling')->value('name'))->toBe('Psychosocial Counseling')
        ->and(FundSource::where('code', 'pcso')->value('is_active'))->toBeFalse();
});

it('orders the lists by sort order, then name', function () {
    FundSource::create(['name' => 'Aardvark Fund', 'code' => 'aardvark', 'sort_order' => 0]);

    expect(FundSource::ordered()->first()->code)->toBe('aardvark');
});
