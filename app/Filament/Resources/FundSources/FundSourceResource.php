<?php

namespace App\Filament\Resources\FundSources;

use App\Filament\Resources\FundSources\Pages\CreateFundSource;
use App\Filament\Resources\FundSources\Pages\EditFundSource;
use App\Filament\Resources\FundSources\Pages\ListFundSources;
use App\Filament\Support\AssessmentLookupResource;
use App\Models\FundSource;
use BackedEnum;
use Filament\Support\Icons\Heroicon;

/**
 * Lookup of UIS §V fund sources. Retire one with "Active" off rather than deleting it:
 * assessments that already use it keep showing it, and it leaves the new-record dropdowns.
 */
class FundSourceResource extends AssessmentLookupResource
{
    protected static ?string $model = FundSource::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedCurrencyDollar;

    protected static ?int $navigationSort = 4;

    protected static bool $hasRequiresSpecify = true;

    protected static ?string $modelLabel = 'fund source';

    protected static ?string $pluralModelLabel = 'fund sources';

    public static function getPages(): array
    {
        return [
            'index' => ListFundSources::route('/'),
            'create' => CreateFundSource::route('/create'),
            'edit' => EditFundSource::route('/{record}/edit'),
        ];
    }
}
