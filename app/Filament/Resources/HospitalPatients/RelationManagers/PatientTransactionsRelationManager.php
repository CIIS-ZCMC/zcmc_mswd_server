<?php

namespace App\Filament\Resources\HospitalPatients\RelationManagers;

use App\Models\Bizbox\PatientTransaction;
use App\Models\CaseModel;
use App\Services\CaseHospitalTransactionService;
use Filament\Actions\Action;
use Filament\Forms\Components\Select;
use Filament\Notifications\Notification;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Support\Icons\Heroicon;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

/**
 * Read-only list of a HIS patient's transactions (psPatRegisters), newest
 * first, with the guarantors on each encounter. The HIS is external and this
 * app never writes to it, so the manager has no create/edit/delete actions.
 */
class PatientTransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'transactions';

    protected static ?string $title = 'Transactions';

    /**
     * Render inline with the view page rather than in a deferred request, so the
     * tab reads the transactions relation the page already eager-loaded instead
     * of re-hydrating the owner (and re-querying the HIS) on a second roundtrip.
     */
    protected static bool $isLazy = false;

    public function table(Table $table): Table
    {
        return $table
            // Eager-load the guarantor chain so the Guarantors column is one
            // query, not one per row.
            ->modifyQueryUsing(fn (Builder $query) => $query->with('guarantors.guarantor.personalData'))
            ->emptyStateHeading('No transactions found in the hospital system.')
            ->columns([
                TextColumn::make('PK_psPatRegisters')
                    ->label('Transaction no.'),
                TextColumn::make('registrydate')
                    ->label('Registered')
                    ->dateTime()
                    ->placeholder('—')
                    ->sortable(),
                TextColumn::make('guarantors')
                    ->label('Guarantors')
                    ->state(fn (PatientTransaction $record) => $record->guarantors
                        ->map(fn ($guarantor) => $guarantor->guarantor?->displayName())
                        ->filter()
                        ->join(', '))
                    ->placeholder('None on file'),
            ])
            ->recordActions([
                $this->assessAction(),
            ])
            ->defaultSort('registrydate', 'desc');
    }

    /**
     * Assess this encounter: attach it to one of the patient's open local cases.
     * Reuses the Phase A attach() service; only open cases of this patient appear.
     */
    protected function assessAction(): Action
    {
        return Action::make('assess')
            ->label('Assess')
            ->icon(Heroicon::OutlinedClipboardDocumentCheck)
            ->visible(fn (): bool => auth()->user()?->can('cases.update') ?? false)
            ->schema([
                Select::make('case_id')
                    ->label('Attach to case')
                    ->required()
                    ->options(fn (PatientTransaction $record) => app(CaseHospitalTransactionService::class)
                        ->assignableCasesFor($record)
                        ->mapWithKeys(fn (CaseModel $case) => [
                            $case->id => trim("{$case->case_code} — ".($case->patient?->last_name ?? ''), ' —'),
                        ])
                        ->all())
                    ->helperText("Only this patient's open cases appear. If there are none, import the patient and open a case first."),
            ])
            ->action(function (PatientTransaction $record, array $data): void {
                try {
                    app(CaseHospitalTransactionService::class)->attach(
                        CaseModel::findOrFail($data['case_id']),
                        $record->getKey(),
                        auth()->user(),
                    );

                    Notification::make()->title('Encounter attached to case')->success()->send();
                } catch (ValidationException $e) {
                    Notification::make()
                        ->title('Could not attach encounter')
                        ->body($e->validator->errors()->first())
                        ->danger()
                        ->send();
                }
            });
    }

    /**
     * Prefer the transactions relation the view page already eager-loaded
     * through the resilient service (ViewHospitalPatient::resolveRecord loads
     * transactions.guarantors.guarantor.personalData in one read): the tab then
     * needs no second sqlsrv round-trip and renders even when a live query would
     * 500. Only when the relation was not pre-loaded does it fall back to the
     * default relationship query, still degrading to an empty page on failure.
     */
    public function getTableRecords(): Collection | Paginator | CursorPaginator
    {
        $owner = $this->getOwnerRecord();

        if ($owner->relationLoaded('transactions')) {
            return $this->paginate($owner->getRelation('transactions'));
        }

        try {
            return parent::getTableRecords();
        } catch (QueryException $e) {
            report($e);

            return $this->paginate(new Collection);
        }
    }

    /**
     * Wrap an in-memory transactions collection (newest first) in a paginator so
     * the table renders it without another query.
     */
    protected function paginate(Collection $transactions): LengthAwarePaginator
    {
        $perPage = $this->getTableRecordsPerPage();
        $perPage = is_numeric($perPage) ? (int) $perPage : 10;
        $page = $this->getTablePage();

        $sorted = $transactions->sortByDesc('registrydate')->values();

        return new LengthAwarePaginator(
            $sorted->forPage($page, $perPage)->values(),
            $sorted->count(),
            $perPage,
            $page,
        );
    }
}
