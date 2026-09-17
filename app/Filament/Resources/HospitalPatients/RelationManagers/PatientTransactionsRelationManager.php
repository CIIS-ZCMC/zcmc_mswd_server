<?php

namespace App\Filament\Resources\HospitalPatients\RelationManagers;

use App\Models\Bizbox\PatientTransaction;
use Filament\Resources\RelationManagers\RelationManager;
use Filament\Tables\Columns\TextColumn;
use Filament\Tables\Table;
use Illuminate\Contracts\Pagination\CursorPaginator;
use Illuminate\Contracts\Pagination\Paginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\QueryException;
use Illuminate\Pagination\LengthAwarePaginator;
use Illuminate\Support\Collection;

/**
 * Read-only list of a HIS patient's transactions (psPatRegisters), newest
 * first, with the guarantors on each encounter. The HIS is external and this
 * app never writes to it, so the manager has no create/edit/delete actions.
 */
class PatientTransactionsRelationManager extends RelationManager
{
    protected static string $relationship = 'transactions';

    protected static ?string $title = 'Transactions';

    public function table(Table $table): Table
    {
        return $table
            // Eager-load the guarantor chain so the Guarantors column is one
            // query, not one per row.
            ->modifyQueryUsing(fn (Builder $query) => $query->with('guarantors.account.personalData'))
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
                        ->map(fn ($guarantor) => $guarantor->account?->displayName())
                        ->filter()
                        ->join(', '))
                    ->placeholder('None on file'),
            ])
            ->defaultSort('registrydate', 'desc');
    }

    /**
     * Degrade to an empty page rather than 500 when the HIS is unreachable: the
     * SQL Server is down on every dev machine and can blink in production, and
     * this manager runs its own sqlsrv query outside the resource's resilient
     * service reads. Mirrors HospitalPatientService::paginateForPanel().
     */
    public function getTableRecords(): Collection | Paginator | CursorPaginator
    {
        try {
            return parent::getTableRecords();
        } catch (QueryException $e) {
            report($e);

            $perPage = $this->getTableRecordsPerPage();

            return new LengthAwarePaginator([], 0, is_numeric($perPage) ? (int) $perPage : 10, $this->getTablePage());
        }
    }
}
