<?php

namespace App\Filament\Resources\ModeOfAssistances;

use App\Filament\Resources\ModeOfAssistances\Pages\CreateModeOfAssistance;
use App\Filament\Resources\ModeOfAssistances\Pages\EditModeOfAssistance;
use App\Filament\Resources\ModeOfAssistances\Pages\ListModeOfAssistances;
use App\Filament\Support\AssessmentLookupResource;
use App\Models\ModeOfAssistance;
use BackedEnum;
use Filament\Support\Icons\Heroicon;

/**
 * Lookup of UIS §V modes of assistance. Retire one with "Active" off rather than deleting it:
 * assessments that already use it keep showing it, and it leaves the new-record dropdowns.
 */
class ModeOfAssistanceResource extends AssessmentLookupResource
{
    protected static ?string $model = ModeOfAssistance::class;

    protected static string|BackedEnum|null $navigationIcon = Heroicon::OutlinedHandRaised;

    protected static ?int $navigationSort = 3;

    protected static ?string $modelLabel = 'mode of assistance';

    protected static ?string $pluralModelLabel = 'modes of assistance';

    protected static ?string $navigationLabel = 'Modes of Assistance';

    public static function getPages(): array
    {
        return [
            'index' => ListModeOfAssistances::route('/'),
            'create' => CreateModeOfAssistance::route('/create'),
            'edit' => EditModeOfAssistance::route('/{record}/edit'),
        ];
    }
}
