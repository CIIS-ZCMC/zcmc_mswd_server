<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Resources\Pages\ListRecords;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    // Users are provisioned via UMIS sync; no create action.
    protected function getHeaderActions(): array
    {
        return [];
    }
}
