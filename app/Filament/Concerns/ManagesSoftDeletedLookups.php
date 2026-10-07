<?php

namespace App\Filament\Concerns;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\SoftDeletingScope;

/**
 * For a Library lookup resource whose model soft-deletes: lets the edit page open a
 * deleted row so it can be restored (the table's TrashedFilter does the listing).
 */
trait ManagesSoftDeletedLookups
{
    public static function getRecordRouteBindingEloquentQuery(): Builder
    {
        return parent::getRecordRouteBindingEloquentQuery()
            ->withoutGlobalScopes([SoftDeletingScope::class]);
    }
}
