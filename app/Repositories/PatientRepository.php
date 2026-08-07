<?php

namespace App\Repositories;

use App\Models\Patient;
use App\Repositories\Contracts\PatientRepositoryInterface;
use Illuminate\Database\Eloquent\Collection;

class PatientRepository extends BaseRepository implements PatientRepositoryInterface
{
    public function __construct(Patient $model)
    {
        parent::__construct($model);
    }

    public function matchByIdentity(string $lastName, string $firstName, ?string $birthdate = null): Collection
    {
        return $this->model->newQuery()
            ->whereRaw('LOWER(last_name) = ?', [mb_strtolower($lastName)])
            ->whereRaw('LOWER(first_name) = ?', [mb_strtolower($firstName)])
            ->when($birthdate !== null, fn ($query) => $query->whereDate('birthdate', $birthdate))
            ->orderBy('last_name')
            ->limit(20)
            ->get();
    }
}
