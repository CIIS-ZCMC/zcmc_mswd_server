<?php

namespace App\Filament\Resources\Patients\RelationManagers;

use App\Models\AssistantType;
use App\Models\FundSource;
use App\Models\Guarantor;
use App\Models\ModeOfAssistance;
use App\Models\PatientGuarantee;
use App\Services\PatientGuaranteeService;
use Filament\Actions\DeleteAction;
use Filament\Actions\EditAction;
use Filament\Actions\RestoreAction;
use Filament\Forms\Components\DatePicker;
use Filament\Forms\Components\Repeater;
use Filament\Forms\Components\Select;
use Filament\Forms\Components\Textarea;
use Filament\Forms\Components\TextInput;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Schemas\Components\Utilities\Get;
use Filament\Schemas\Schema;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Filters\SelectFilter;
use Filament\Tables\Filters\TrashedFilter;
use Filament\Tables\Table;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletingScope;

/**
 * The patient's MSWD guarantors, one per hospital encounter, with their breakdown.
 * Recording a guarantee needs the HIS encounter, so it happens in the app; here a
 * guarantee is reviewed, corrected (through PatientGuaranteeService, like the API) or
 * deleted. Each line is Type of Assistance, Amount, Mode of Assistance, Fund Source.
 */
class GuaranteesRelationManager extends RelationManager
{
    protected static string $relationship = 'guarantees';

    protected static ?string $title = 'Guarantees';

    public static function canViewForRecord(Model $ownerRecord, string $pageClass): bool
    {
        return auth()->user()?->can('guarantee.view') ?? false;
    }

    public function isReadOnly(): bool
    {
        return false;
    }

    public function canCreate(): bool
    {
        return false;
    }

    public function canEdit(Model $record): bool
    {
        return auth()->user()?->can('guarantee.update') ?? false;
    }

    public function canDelete(Model $record): bool
    {
        return auth()->user()?->can('guarantee.delete') ?? false;
    }

    public function canRestore(Model $record): bool
    {
        return auth()->user()?->can('guarantee.delete') ?? false;
    }

    public function form(Schema $schema): Schema
    {
        return $schema->components([
            Select::make('guarantor_id')
                ->label('Guarantor')
                ->required()
                ->options(fn (?PatientGuarantee $record) => Guarantor::idOptions($record ? [(int) $record->guarantor_id] : [])),
            TextInput::make('reference_no')->label('Reference no.')->maxLength(255),
            DatePicker::make('guaranteed_on')->label('Guaranteed on')->required(),
            Textarea::make('remarks')->columnSpanFull(),
            Repeater::make('items')
                ->label('Breakdown')
                ->required()
                ->minItems(1)
                ->columns(4)
                ->columnSpanFull()
                ->addActionLabel('Add line')
                ->schema([
                    Select::make('assistant_type_id')
                        ->label('Type of Assistance')
                        ->required()
                        ->distinct()
                        ->disableOptionsWhenSelectedInSiblingRepeaterItems()
                        ->options(fn (?PatientGuarantee $record) => AssistantType::idOptions(self::usedIds($record, 'assistant_type_id'))),
                    TextInput::make('amount')
                        ->label('Amount')
                        ->required()
                        ->numeric()
                        ->minValue(0.01)
                        ->prefix('₱'),
                    Select::make('mode_of_assistance_id')
                        ->label('Mode of Assistance')
                        ->required()
                        ->options(fn (?PatientGuarantee $record) => ModeOfAssistance::idOptions(self::usedIds($record, 'mode_of_assistance_id'))),
                    Select::make('fund_source_id')
                        ->label('Fund Source')
                        ->required()
                        ->live()
                        ->options(fn (?PatientGuarantee $record) => FundSource::idOptions(self::usedIds($record, 'fund_source_id'))),
                    TextInput::make('others_specify')
                        ->label('Specify')
                        ->maxLength(255)
                        ->columnSpanFull()
                        ->visible(fn (Get $get) => self::fundRequiresSpecify($get('fund_source_id')))
                        ->required(fn (Get $get) => self::fundRequiresSpecify($get('fund_source_id'))),
                ]),
        ]);
    }

    public function table(Table $table): Table
    {
        return $table
            ->modifyQueryUsing(fn (Builder $query) => $query
                ->withoutGlobalScopes([SoftDeletingScope::class])
                ->with(['guarantor' => fn ($q) => $q->withTrashed(), 'recordedBy'])
                ->withCount('items')
                ->withSum('items', 'amount'))
            ->columns([
                TextColumn::make('guaranteed_on')->label('Guaranteed on')->date()->sortable(),
                TextColumn::make('his_transaction_id')->label('Encounter'),
                TextColumn::make('guarantor.name')->label('Guarantor'),
                TextColumn::make('reference_no')->label('Reference no.')->placeholder('—')->searchable(),
                TextColumn::make('items_count')->label('Lines'),
                TextColumn::make('items_sum_amount')->label('Total')->money('PHP'),
                TextColumn::make('recordedBy.employee_name')->label('Recorded by')->placeholder('—')->toggleable(),
            ])
            ->defaultSort('guaranteed_on', 'desc')
            ->filters([
                SelectFilter::make('guarantor_id')->label('Guarantor')->options(fn () => Guarantor::withTrashed()->orderBy('name')->pluck('name', 'id')),
                TrashedFilter::make(),
            ])
            ->recordActions([
                EditAction::make()
                    ->authorize(fn (PatientGuarantee $record): bool => $this->canEdit($record))
                    ->modalWidth('5xl')
                    ->mutateRecordDataUsing(fn (array $data, PatientGuarantee $record): array => [
                        ...$data,
                        'items' => $record->items()->orderBy('id')->get()
                            ->map(fn ($item) => $item->only(['assistant_type_id', 'amount', 'mode_of_assistance_id', 'fund_source_id', 'others_specify']))
                            ->all(),
                    ])
                    ->using(fn (PatientGuarantee $record, array $data): PatientGuarantee => app(PatientGuaranteeService::class)->update($record, [
                        ...$data,
                        'items' => array_values(array_map(fn (array $item) => [
                            ...$item,
                            'others_specify' => self::fundRequiresSpecify($item['fund_source_id'] ?? null) ? ($item['others_specify'] ?? null) : null,
                        ], $data['items'] ?? [])),
                    ])),
                DeleteAction::make()
                    ->authorize(fn (PatientGuarantee $record): bool => $this->canDelete($record))
                    ->using(fn (PatientGuarantee $record): bool => app(PatientGuaranteeService::class)->delete($record)),
                RestoreAction::make()
                    ->authorize(fn (PatientGuarantee $record): bool => $this->canRestore($record)),
            ])
            ->emptyStateHeading('No guarantees')
            ->emptyStateDescription('Guarantees are recorded from the hospital encounter in the app.');
    }

    /**
     * The ids the guarantee's lines already use in a column, so a retired option stays
     * selectable on it.
     *
     * @return list<int>
     */
    private static function usedIds(?PatientGuarantee $record, string $column): array
    {
        if ($record === null) {
            return [];
        }

        return $record->items->pluck($column)->filter()->map(fn ($id) => (int) $id)->unique()->values()->all();
    }

    private static function fundRequiresSpecify(mixed $fundSourceId): bool
    {
        return filled($fundSourceId)
            && (bool) FundSource::withTrashed()->whereKey($fundSourceId)->value('requires_specify');
    }
}
