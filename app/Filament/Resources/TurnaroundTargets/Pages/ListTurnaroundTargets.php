<?php

namespace App\Filament\Resources\TurnaroundTargets\Pages;

use App\Filament\Resources\TurnaroundTargets\TurnaroundTargetResource;
use Filament\Resources\Pages\ListRecords;

class ListTurnaroundTargets extends ListRecords
{
    protected static string $resource = TurnaroundTargetResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
