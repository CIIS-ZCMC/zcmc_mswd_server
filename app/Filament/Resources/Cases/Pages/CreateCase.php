<?php

namespace App\Filament\Resources\Cases\Pages;

use App\DTOs\CaseModelDto;
use App\Filament\Resources\Cases\CaseResource;
use App\Services\CaseModelService;
use Filament\Resources\Pages\CreateRecord;
use Illuminate\Database\Eloquent\Model;

class CreateCase extends CreateRecord
{
    protected static string $resource = CaseResource::class;

    /**
     * Route through the service so the case_code, status and milestone are set.
     */
    protected function handleRecordCreation(array $data): Model
    {
        return app(CaseModelService::class)->create(CaseModelDto::fromArray($data), auth()->user());
    }
}
