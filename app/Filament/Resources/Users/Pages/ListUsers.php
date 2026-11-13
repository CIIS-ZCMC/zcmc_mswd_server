<?php

namespace App\Filament\Resources\Users\Pages;

use App\Filament\Resources\Users\UserResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ListRecords;

class ListUsers extends ListRecords
{
    protected static string $resource = UserResource::class;

    // Shown only under AUTH_PROVIDER=local (UserResource::canCreate); under
    // UMIS or IAM users are provisioned on sign-in.
    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
