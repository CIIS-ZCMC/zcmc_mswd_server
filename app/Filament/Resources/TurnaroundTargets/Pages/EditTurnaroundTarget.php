<?php

namespace App\Filament\Resources\TurnaroundTargets\Pages;

use App\Filament\Resources\TurnaroundTargets\TurnaroundTargetResource;
use Filament\Resources\Pages\EditRecord;

class EditTurnaroundTarget extends EditRecord
{
    protected static string $resource = TurnaroundTargetResource::class;

    protected function getHeaderActions(): array
    {
        return [];
    }
}
